/**
 * MediaValidator - Pre-encoding validation layer
 * 
 * Enterprise-grade input validation before conversion attempts.
 * Validates file integrity, codec support, and format compatibility.
 * 
 * Industry Standard: Media Asset Management (MAM) validation patterns
 */

import { spawn } from 'child_process';
import { FFMPEG_CONFIG } from '../../config/ffmpeg.js';
import logger from '../../utils/logger.js';

export class MediaValidator {
  /**
   * Validate media file before processing
   * @param {string} inputPath - Path to input file
   * @param {string} targetFormat - Target output format
   * @returns {Promise<ValidationResult>}
   */
  static async validate(inputPath, targetFormat) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      metadata: null,
      recommendations: []
    };

    try {
      // Step 1: Get comprehensive metadata
      result.metadata = await this.getDetailedMetadata(inputPath);

      // Step 2: Validate file integrity
      const integrityCheck = this.validateIntegrity(result.metadata);
      if (!integrityCheck.valid) {
        result.valid = false;
        result.errors.push(...integrityCheck.errors);
      }

      // Step 3: Validate codec compatibility
      const codecCheck = this.validateCodecs(result.metadata, targetFormat);
      if (!codecCheck.valid) {
        result.warnings.push(...codecCheck.warnings);
        result.recommendations.push(...codecCheck.recommendations);
      }

      // Step 4: Validate stream structure
      const streamCheck = this.validateStreams(result.metadata);
      if (!streamCheck.valid) {
        result.warnings.push(...streamCheck.warnings);
      }

      logger.info(`Media validation for ${inputPath}: ${result.valid ? 'PASSED' : 'FAILED'}`);
      
      return result;

    } catch (error) {
      logger.error(`Media validation failed: ${error.message}`);
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: [],
        metadata: null,
        recommendations: ['Verify file is not corrupted', 'Check file permissions']
      };
    }
  }

  /**
   * Get detailed media metadata using ffprobe
   */
  static async getDetailedMetadata(inputPath) {
    return new Promise((resolve, reject) => {
      const ffprobePath = 'ffprobe';
      
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        '-show_error',
        '-count_frames',
        inputPath
      ];

      const ffprobe = spawn(ffprobePath, args);
      let output = '';
      let errorOutput = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0 && output) {
          try {
            const metadata = JSON.parse(output);
            resolve(metadata);
          } catch (error) {
            reject(new Error('Failed to parse metadata'));
          }
        } else {
          reject(new Error(`FFprobe failed: ${errorOutput || 'Unknown error'}`));
        }
      });

      ffprobe.on('error', (error) => {
        reject(new Error(`FFprobe error: ${error.message}`));
      });
    });
  }

  /**
   * Validate file integrity
   */
  static validateIntegrity(metadata) {
    const result = { valid: true, errors: [] };

    if (!metadata || !metadata.format) {
      result.valid = false;
      result.errors.push('Invalid or corrupted file: No format information');
      return result;
    }

    // Check for duration
    if (!metadata.format.duration || parseFloat(metadata.format.duration) <= 0) {
      result.valid = false;
      result.errors.push('Invalid file: Duration is zero or missing');
    }

    // Check for streams
    if (!metadata.streams || metadata.streams.length === 0) {
      result.valid = false;
      result.errors.push('Invalid file: No media streams found');
    }

    // Check for video stream
    const hasVideo = metadata.streams.some(s => s.codec_type === 'video');
    if (!hasVideo) {
      result.valid = false;
      result.errors.push('Invalid file: No video stream found');
    }

    return result;
  }

  /**
   * Validate codec compatibility with target format
   */
  static validateCodecs(metadata, targetFormat) {
    const result = { valid: true, warnings: [], recommendations: [] };

    const videoStream = metadata.streams.find(s => s.codec_type === 'video');
    const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

    if (!videoStream) {
      result.valid = false;
      result.warnings.push('No video stream found');
      return result;
    }

    // Format-specific codec warnings
    if (targetFormat === 'mpeg') {
      // MPEG-2 has specific codec requirements
      if (videoStream.codec_name === 'h264' || videoStream.codec_name === 'hevc') {
        result.recommendations.push('Re-encoding to MPEG-2 video required');
      }

      if (audioStream && !['mp2', 'mp3', 'ac3'].includes(audioStream.codec_name)) {
        result.recommendations.push('Re-encoding to MPEG-compatible audio required');
      }

      // Check resolution limits
      if (videoStream.width > 1920 || videoStream.height > 1080) {
        result.recommendations.push('Resolution exceeds MPEG-2 limits, downscaling required');
      }
    }

    return result;
  }

  /**
   * Validate stream structure
   */
  static validateStreams(metadata) {
    const result = { valid: true, warnings: [] };

    const videoStreams = metadata.streams.filter(s => s.codec_type === 'video');
    const audioStreams = metadata.streams.filter(s => s.codec_type === 'audio');

    // Multiple video streams
    if (videoStreams.length > 1) {
      result.warnings.push(`Multiple video streams detected (${videoStreams.length}), using first stream`);
    }

    // Multiple audio streams
    if (audioStreams.length > 1) {
      result.warnings.push(`Multiple audio streams detected (${audioStreams.length}), using first stream`);
    }

    // Check for unusual frame rates
    const videoStream = videoStreams[0];
    if (videoStream && videoStream.r_frame_rate) {
      const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
      const fps = num / den;
      if (fps > 120) {
        result.warnings.push(`Unusually high frame rate detected: ${fps.toFixed(2)} fps`);
      }
    }

    return result;
  }
}

export default MediaValidator;
