import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import {
  FFMPEG_CONFIG,
  CONVERSION_PRESETS,
  PATHS,
  getFormatByExtension,
  checkResolutionDownscaling,
  buildScaleFilter
} from '../config/ffmpeg.js';
import logger from '../utils/logger.js';

/**
 * Ensure output directory exists
 */
const ensureOutputDir = async () => {
  try {
    await fs.access(PATHS.outputs);
  } catch {
    await fs.mkdir(PATHS.outputs, { recursive: true });
    logger.info(`Created outputs directory: ${PATHS.outputs}`);
  }
};

/**
 * Get video metadata using ffprobe
 */
export const getVideoMetadata = async (inputPath) => {
  return new Promise((resolve, reject) => {
    // Use system ffprobe (ffmpeg-static doesn't include ffprobe)
    const ffprobePath = 'ffprobe';
    
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
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
      if (code === 0) {
        try {
          const metadata = JSON.parse(output);
          resolve(metadata);
        } catch (error) {
          reject(new Error('Failed to parse video metadata'));
        }
      } else {
        reject(new Error(`FFprobe failed: ${errorOutput}`));
      }
    });

    ffprobe.on('error', (error) => {
      reject(new Error(`FFprobe error: ${error.message}`));
    });
  });
};

/**
 * Build FFmpeg arguments based on input format and quality settings
 * Using CRF (Constant Rate Factor) for automatic bitrate calculation
 */
const buildFFmpegArgs = (inputPath, outputPath, options = {}) => {
  const {
    quality = 'medium',
    preserveMetadata = true,
    metadata = null
  } = options;

  const preset = CONVERSION_PRESETS[quality] || CONVERSION_PRESETS.medium;
  const inputExt = path.extname(inputPath).toLowerCase();
  const formatInfo = getFormatByExtension(inputExt);

  const args = [
    '-i', inputPath,
    '-c:v', preset.videoCodec,
    '-c:a', preset.audioCodec,
    '-preset', preset.preset
  ];

  // Use CRF for quality-based encoding (Variable Bitrate)
  // Lower CRF = higher quality, larger file
  // CRF 18 = visually lossless, CRF 23 = default high quality, CRF 28 = acceptable quality
  args.push('-crf', preset.crf.toString());

  // Audio bitrate
  args.push('-b:a', preset.audioBitrate);

  // Pixel format for compatibility
  args.push('-pix_fmt', 'yuv420p');

  // Check for resolution downscaling (4K to 1080p)
  let videoFilters = [];
  if (metadata) {
    const resolutionInfo = checkResolutionDownscaling(metadata);
    if (resolutionInfo.needsDownscaling) {
      const scaleFilter = buildScaleFilter(resolutionInfo);
      if (scaleFilter) {
        videoFilters.push(scaleFilter);
        logger.info(`Auto-downscaling from ${resolutionInfo.currentWidth}x${resolutionInfo.currentHeight} to ${resolutionInfo.targetWidth}x${resolutionInfo.targetHeight}`);
      }
    }
  }

  // Add format-specific optimizations
  if (formatInfo) {
    switch (formatInfo.name) {
      case 'FLV':
        // FLV might need audio resampling
        args.push('-ar', '44100');
        break;
      case 'WMV':
        // WMV might need frame rate adjustment
        args.push('-r', '30');
        break;
      case '3GP':
      case '3G2':
        // 3GP/3G2 might need scaling
        if (videoFilters.length === 0) {
          videoFilters.push('scale=trunc(iw/2)*2:trunc(ih/2)*2');
        }
        break;
      case 'WEBM':
        // WebM is already web-optimized
        args.push('-movflags', '+faststart');
        break;
      default:
        // Default web optimization
        args.push('-movflags', '+faststart');
    }
  }

  // Apply video filters if any
  if (videoFilters.length > 0) {
    args.push('-vf', videoFilters.join(','));
  }

  // Preserve metadata if requested
  if (preserveMetadata) {
    args.push('-map_metadata', '0');
  }

  // Error handling and compatibility
  args.push('-max_muxing_queue_size', '1024');
  args.push('-y'); // Overwrite output file

  args.push(outputPath);

  return args;
};

/**
 * Convert video to MP4
 */
export const convertToMp4 = async (inputPath, options = {}) => {
  try {
    await ensureOutputDir();

    const inputFilename = path.basename(inputPath);
    const inputExt = path.extname(inputPath);
    const outputFilename = `${uuidv4()}.mp4`;
    const outputPath = path.join(PATHS.outputs, outputFilename);

    logger.info(`Starting conversion: ${inputFilename} -> ${outputFilename}`);
    logger.info(`Input format: ${inputExt}, Quality: ${options.quality || 'medium'}`);

    // Get input video metadata
    let metadata;
    try {
      metadata = await getVideoMetadata(inputPath);
      logger.info(`Input video duration: ${metadata.format.duration}s, size: ${metadata.format.size} bytes`);
      
      // Log video resolution
      const videoStream = metadata.streams?.find(s => s.codec_type === 'video');
      if (videoStream) {
        logger.info(`Input resolution: ${videoStream.width}x${videoStream.height}`);
      }
    } catch (error) {
      logger.warn(`Could not retrieve metadata: ${error.message}`);
    }

    // Build FFmpeg arguments with metadata for resolution checking
    const args = buildFFmpegArgs(inputPath, outputPath, { ...options, metadata });
    
    logger.info(`FFmpeg command: ${FFMPEG_CONFIG.path} ${args.join(' ')}`);

    // Execute FFmpeg conversion
    const result = await new Promise((resolve, reject) => {
      const ffmpeg = spawn(FFMPEG_CONFIG.path, args);
      let stderr = '';
      let conversionProgress = {
        frame: 0,
        fps: 0,
        time: '00:00:00',
        bitrate: '0kbits/s',
        speed: '0x'
      };

      // Timeout handler
      const timeout = setTimeout(() => {
        ffmpeg.kill('SIGKILL');
        reject(new Error('Conversion timeout exceeded'));
      }, FFMPEG_CONFIG.timeout);

      ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;

        // Parse progress information
        const frameMatch = output.match(/frame=\s*(\d+)/);
        const fpsMatch = output.match(/fps=\s*([\d.]+)/);
        const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
        const bitrateMatch = output.match(/bitrate=\s*([\d.]+\w+\/s)/);
        const speedMatch = output.match(/speed=\s*([\d.]+)x/);

        if (frameMatch) conversionProgress.frame = parseInt(frameMatch[1]);
        if (fpsMatch) conversionProgress.fps = parseFloat(fpsMatch[1]);
        if (timeMatch) conversionProgress.time = timeMatch[1];
        if (bitrateMatch) conversionProgress.bitrate = bitrateMatch[1];
        if (speedMatch) conversionProgress.speed = speedMatch[1];

        // Log progress periodically
        if (conversionProgress.frame % 100 === 0 && conversionProgress.frame > 0) {
          logger.info(`Progress: frame=${conversionProgress.frame}, time=${conversionProgress.time}, speed=${conversionProgress.speed}`);
        }
      });

      ffmpeg.on('close', (code) => {
        clearTimeout(timeout);

        if (code === 0) {
          logger.info(`Conversion successful: ${outputFilename}`);
          resolve({
            success: true,
            outputPath,
            outputFilename,
            progress: conversionProgress
          });
        } else {
          logger.error(`FFmpeg exited with code ${code}`);
          logger.error(`FFmpeg stderr: ${stderr}`);
          reject(new Error(`Conversion failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        clearTimeout(timeout);
        logger.error(`FFmpeg process error: ${error.message}`);
        reject(new Error(`FFmpeg process error: ${error.message}`));
      });
    });

    // Get output file stats
    const outputStats = await fs.stat(outputPath);
    const reductionPercentage = metadata 
      ? ((1 - outputStats.size / parseInt(metadata.format.size)) * 100).toFixed(2)
      : 'N/A';

    logger.info(`Output file size: ${outputStats.size} bytes (${reductionPercentage}% reduction)`);

    return {
      success: true,
      outputPath,
      outputFilename,
      inputFilename,
      outputSize: outputStats.size,
      metadata: metadata || null,
      quality: options.quality || 'medium',
      reductionPercentage
    };

  } catch (error) {
    logger.error(`Conversion error: ${error.message}`);
    throw error;
  }
};

/**
 * Clean up uploaded file
 */
export const cleanupFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    logger.info(`Cleaned up file: ${filePath}`);
  } catch (error) {
    logger.error(`Failed to cleanup file ${filePath}: ${error.message}`);
  }
};

/**
 * Clean up old files (older than specified days)
 */
export const cleanupOldFiles = async (directory, daysOld = 7) => {
  try {
    const files = await fs.readdir(directory);
    const now = Date.now();
    const maxAge = daysOld * 24 * 60 * 60 * 1000;

    let cleanedCount = 0;

    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fs.stat(filePath);

      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath);
        cleanedCount++;
        logger.info(`Cleaned up old file: ${file}`);
      }
    }

    logger.info(`Cleaned up ${cleanedCount} old files from ${directory}`);
    return cleanedCount;

  } catch (error) {
    logger.error(`Failed to cleanup old files: ${error.message}`);
    throw error;
  }
};

/**
 * Get conversion statistics
 */
export const getConversionStats = async () => {
  try {
    const uploadsFiles = await fs.readdir(PATHS.uploads);
    const outputsFiles = await fs.readdir(PATHS.outputs);

    const uploadsSize = await Promise.all(
      uploadsFiles.map(async (file) => {
        const stats = await fs.stat(path.join(PATHS.uploads, file));
        return stats.size;
      })
    );

    const outputsSize = await Promise.all(
      outputsFiles.map(async (file) => {
        const stats = await fs.stat(path.join(PATHS.outputs, file));
        return stats.size;
      })
    );

    return {
      uploads: {
        count: uploadsFiles.length,
        totalSize: uploadsSize.reduce((a, b) => a + b, 0)
      },
      outputs: {
        count: outputsFiles.length,
        totalSize: outputsSize.reduce((a, b) => a + b, 0)
      }
    };
  } catch (error) {
    logger.error(`Failed to get conversion stats: ${error.message}`);
    throw error;
  }
};

export default {
  convertToMp4,
  getVideoMetadata,
  cleanupFile,
  cleanupOldFiles,
  getConversionStats
};
