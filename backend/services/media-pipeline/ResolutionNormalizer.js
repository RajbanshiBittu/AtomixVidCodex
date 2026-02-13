/**
 * ResolutionNormalizer - Automatic resolution adjustment
 * 
 * Normalizes video resolution based on target format constraints.
 * Implements safe scaling with aspect ratio preservation.
 * 
 * Industry Standard: SMPTE RP 2071 (Ultra HD Content Production Ecosystem)
 */

import { FormatCapabilityMatrix } from './FormatCapabilityMatrix.js';
import logger from '../../utils/logger.js';

export class ResolutionNormalizer {
  /**
   * Normalize resolution for target format
   * @param {object} metadata - Video metadata
   * @param {string} targetFormat - Target output format
   * @returns {object} Normalization result
   */
  static normalize(metadata, targetFormat) {
    const result = {
      needsNormalization: false,
      originalResolution: null,
      targetResolution: null,
      scaleFilter: null,
      reason: null,
      warnings: []
    };

    try {
      // Extract video stream
      const videoStream = metadata.streams?.find(s => s.codec_type === 'video');
      
      if (!videoStream) {
        throw new Error('No video stream found');
      }

      const sourceWidth = videoStream.width;
      const sourceHeight = videoStream.height;

      result.originalResolution = { width: sourceWidth, height: sourceHeight };

      // Check if resolution is supported
      const supportCheck = FormatCapabilityMatrix.isResolutionSupported(
        sourceWidth,
        sourceHeight,
        targetFormat
      );

      if (!supportCheck.supported) {
        // Resolution needs normalization
        result.needsNormalization = true;
        result.reason = supportCheck.reason;

        // Get safe fallback resolution
        const targetRes = FormatCapabilityMatrix.getSafeFallbackResolution(
          targetFormat,
          sourceWidth,
          sourceHeight
        );

        result.targetResolution = targetRes;
        result.scaleFilter = this.buildScaleFilter(targetRes.width, targetRes.height);

        logger.info(
          `Resolution normalization required: ${sourceWidth}x${sourceHeight} → ${targetRes.width}x${targetRes.height} for ${targetFormat.toUpperCase()}`
        );

        // Add warnings based on scale ratio
        const scaleRatio = (targetRes.width * targetRes.height) / (sourceWidth * sourceHeight);
        
        if (scaleRatio < 0.25) {
          result.warnings.push('Significant quality loss expected due to downscaling (>75% reduction)');
        } else if (scaleRatio > 2) {
          result.warnings.push('Upscaling may introduce artifacts');
        }

      } else {
        // Resolution is supported, but ensure even dimensions
        if (sourceWidth % 2 !== 0 || sourceHeight % 2 !== 0) {
          result.needsNormalization = true;
          result.reason = 'Ensuring even dimensions for codec compatibility';
          
          const adjustedWidth = Math.round(sourceWidth / 2) * 2;
          const adjustedHeight = Math.round(sourceHeight / 2) * 2;
          
          result.targetResolution = { width: adjustedWidth, height: adjustedHeight };
          result.scaleFilter = this.buildScaleFilter(adjustedWidth, adjustedHeight);

          logger.info(`Adjusting to even dimensions: ${sourceWidth}x${sourceHeight} → ${adjustedWidth}x${adjustedHeight}`);
        } else {
          result.targetResolution = { width: sourceWidth, height: sourceHeight };
          logger.info(`Resolution ${sourceWidth}x${sourceHeight} is compatible with ${targetFormat.toUpperCase()}`);
        }
      }

      return result;

    } catch (error) {
      logger.error(`Resolution normalization error: ${error.message}`);
      
      // Return safe defaults on error
      return {
        needsNormalization: true,
        originalResolution: null,
        targetResolution: { width: 1280, height: 720 },
        scaleFilter: 'scale=1280:720',
        reason: 'Error during analysis, using safe default 720p',
        warnings: ['Could not determine optimal resolution']
      };
    }
  }

  /**
   * Build FFmpeg scale filter
   */
  static buildScaleFilter(width, height) {
    return `scale=${width}:${height}`;
  }

  /**
   * Build complex scale filter with additional processing
   */
  static buildComplexScaleFilter(width, height, options = {}) {
    const filters = [];

    // Deinterlace if needed
    if (options.deinterlace) {
      filters.push('yadif=0:-1:0');
    }

    // Scale
    filters.push(`scale=${width}:${height}`);

    // Additional filters
    if (options.denoise) {
      filters.push('hqdn3d=1.5:1.5:6:6');
    }

    if (options.sharpen) {
      filters.push('unsharp=5:5:1.0:5:5:0.0');
    }

    return filters.join(',');
  }

  /**
   * Calculate optimal resolution maintaining aspect ratio
   */
  static calculateAspectRatioMaintained(sourceWidth, sourceHeight, maxWidth, maxHeight) {
    const sourceAspectRatio = sourceWidth / sourceHeight;
    const targetAspectRatio = maxWidth / maxHeight;

    let targetWidth, targetHeight;

    if (sourceAspectRatio > targetAspectRatio) {
      // Source is wider - fit to width
      targetWidth = maxWidth;
      targetHeight = Math.round(maxWidth / sourceAspectRatio);
    } else {
      // Source is taller - fit to height
      targetHeight = maxHeight;
      targetWidth = Math.round(maxHeight * sourceAspectRatio);
    }

    // Ensure even dimensions
    targetWidth = Math.round(targetWidth / 2) * 2;
    targetHeight = Math.round(targetHeight / 2) * 2;

    return { width: targetWidth, height: targetHeight };
  }

  /**
   * Get standard resolutions for format
   */
  static getStandardResolutions(targetFormat) {
    const standards = {
      mpeg: [
        { name: 'PAL DVD', width: 720, height: 576, fps: 25 },
        { name: 'NTSC DVD', width: 720, height: 480, fps: 29.97 },
        { name: 'HD 720p', width: 1280, height: 720, fps: 25 },
        { name: 'Full HD 1080p', width: 1920, height: 1080, fps: 25 }
      ],
      mp4: [
        { name: '480p', width: 854, height: 480 },
        { name: '720p', width: 1280, height: 720 },
        { name: '1080p', width: 1920, height: 1080 },
        { name: '4K', width: 3840, height: 2160 }
      ],
      webm: [
        { name: '360p', width: 640, height: 360 },
        { name: '480p', width: 854, height: 480 },
        { name: '720p', width: 1280, height: 720 },
        { name: '1080p', width: 1920, height: 1080 }
      ]
    };

    return standards[targetFormat] || standards.mp4;
  }

  /**
   * Select best standard resolution
   */
  static selectBestStandardResolution(sourceWidth, sourceHeight, targetFormat) {
    const standards = this.getStandardResolutions(targetFormat);
    const sourcePixels = sourceWidth * sourceHeight;

    // Find closest standard without upscaling
    let bestMatch = standards[0];
    let minDiff = Math.abs(sourcePixels - (bestMatch.width * bestMatch.height));

    for (const standard of standards) {
      const standardPixels = standard.width * standard.height;
      
      // Prefer not upscaling
      if (standardPixels > sourcePixels) {
        continue;
      }

      const diff = Math.abs(sourcePixels - standardPixels);
      if (diff < minDiff) {
        minDiff = diff;
        bestMatch = standard;
      }
    }

    return bestMatch;
  }
}

export default ResolutionNormalizer;
