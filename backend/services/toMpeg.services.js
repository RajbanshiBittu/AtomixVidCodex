import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import {
  FFMPEG_CONFIG,
  MPEG_CONVERSION_PRESETS,
  PATHS,
  getFormatByExtension
} from '../config/ffmpeg.js';
import logger from '../utils/logger.js';
import { ConversionPipeline } from './media-pipeline/ConversionPipeline.js';

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
 * Build FFmpeg arguments for MPEG conversion
 * MPEG-2 doesn't support CRF, using VBR with average bitrate targets
 */
const buildMpegFFmpegArgs = (inputPath, outputPath, options = {}) => {
  const {
    quality = 'medium',
    preserveMetadata = true
  } = options;

  const preset = MPEG_CONVERSION_PRESETS[quality] || MPEG_CONVERSION_PRESETS.medium;
  const inputExt = path.extname(inputPath).toLowerCase();
  const formatInfo = getFormatByExtension(inputExt);

  const args = [
    '-i', inputPath,
    '-c:v', preset.videoCodec,
    '-c:a', preset.audioCodec
  ];

  // MPEG-2 uses VBR with average bitrate target
  // -b:v sets target average, -maxrate/-minrate create VBR range
  args.push('-b:v', preset.avgBitrate);
  args.push('-b:a', preset.audioBitrate);

  // MPEG-2 specific VBR settings
  args.push('-bufsize', preset.bufferSize);
  args.push('-maxrate', preset.maxRate);
  args.push('-minrate', preset.avgBitrate);

  // Video settings for MPEG compatibility
  args.push('-pix_fmt', 'yuv420p');
  args.push('-g', '12'); // GOP size for MPEG-2
  args.push('-bf', '2'); // B-frames

  // Audio settings for MPEG compatibility
  args.push('-ar', '48000'); // Sample rate
  args.push('-ac', '2'); // Stereo

  // Add format-specific optimizations
  if (formatInfo) {
    switch (formatInfo.name) {
      case 'MOV':
        // MOV/QuickTime optimization
        args.push('-qscale:v', '2'); // High quality for MOV source
        break;
      case 'MKV':
        // MKV might have multiple streams
        args.push('-map', '0:v:0', '-map', '0:a:0');
        break;
      case 'AVI':
        // AVI might need dimension adjustment
        args.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2');
        break;
      case 'WMV':
        // WMV might need frame rate adjustment
        args.push('-r', '25'); // PAL standard for MPEG
        break;
      case 'MP4':
        // MP4 is usually well-structured
        args.push('-qscale:v', '2');
        break;
    }
  }

  // MPEG format specification
  args.push('-f', preset.format);

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
 * Core MPEG conversion function with enterprise pipeline support
 * 
 * Pipeline Mode (USE_MEDIA_PIPELINE=true):
 *  - Pre-encoding validation
 *  - Format capability check
 *  - Resolution normalization
 *  - Profile-based encoding
 *  - Error abstraction
 * 
 * Legacy Mode (default):
 *  - Direct FFmpeg conversion (existing behavior)
 */
export const convertToMpeg = async (inputPath, options = {}) => {
  try {
    await ensureOutputDir();

    const inputFilename = path.basename(inputPath);
    const inputExt = path.extname(inputPath);
    const outputFilename = `${uuidv4()}.mpeg`;
    const outputPath = path.join(PATHS.outputs, outputFilename);

    logger.info(`Starting MPEG conversion: ${inputFilename} -> ${outputFilename}`);
    logger.info(`Input format: ${inputExt}, Quality: ${options.quality || 'medium'}`);

    // ============================================================
    // ENTERPRISE PIPELINE MODE
    // ============================================================
    // Enable with USE_MEDIA_PIPELINE=true environment variable
    // This prevents encoder initialization failures (exit code 234)
    // by validating and normalizing inputs before FFmpeg execution
    if (process.env.USE_MEDIA_PIPELINE === 'true') {
      logger.info('🚀 Using enterprise media pipeline');
      
      try {
        const pipelineResult = await ConversionPipeline.execute({
          inputPath,
          outputPath,
          targetFormat: 'mpeg',
          profile: options.profile || null,
          options
        });

        // Get output file stats
        const outputStats = await fs.stat(outputPath);

        logger.info(`✓ Pipeline conversion complete: ${outputFilename}`);
        logger.info(`  Profile: ${pipelineResult.profile}`);
        logger.info(`  Resolution: ${pipelineResult.adjustments.originalResolution.width}x${pipelineResult.adjustments.originalResolution.height} → ${pipelineResult.adjustments.finalResolution.width}x${pipelineResult.adjustments.finalResolution.height}`);
        logger.info(`  Output size: ${outputStats.size} bytes`);

        return {
          success: true,
          outputPath,
          outputFilename,
          inputFilename,
          outputSize: outputStats.size,
          mode: 'pipeline',
          profile: pipelineResult.profile,
          adjustments: pipelineResult.adjustments,
          pipeline: pipelineResult.pipeline
        };

      } catch (pipelineError) {
        logger.error(`Pipeline conversion failed: ${pipelineError.message}`);
        logger.warn('⚠ Falling back to legacy conversion mode');
        
        // Fall back to legacy mode on pipeline failure
        // This ensures backward compatibility
      }
    }

    // ============================================================
    // LEGACY CONVERSION MODE (DEFAULT)
    // ============================================================
    // Original implementation - maintains backward compatibility
    logger.info('Using legacy conversion mode');

    // Get input video metadata
    let metadata;
    try {
      metadata = await getVideoMetadata(inputPath);
      logger.info(`Input video duration: ${metadata.format.duration}s, size: ${metadata.format.size} bytes`);
    } catch (error) {
      logger.warn(`Could not retrieve metadata: ${error.message}`);
    }

    // Build FFmpeg arguments
    const args = buildMpegFFmpegArgs(inputPath, outputPath, options);
    
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
          logger.info(`MPEG Progress: frame=${conversionProgress.frame}, time=${conversionProgress.time}, speed=${conversionProgress.speed}`);
        }
      });

      ffmpeg.on('close', (code) => {
        clearTimeout(timeout);

        if (code === 0) {
          logger.info(`MPEG conversion successful: ${outputFilename}`);
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

    logger.info(`Output file size: ${outputStats.size} bytes (${reductionPercentage}% size change)`);

    return {
      success: true,
      outputPath,
      outputFilename,
      inputFilename,
      outputSize: outputStats.size,
      metadata: metadata || null,
      quality: options.quality || 'medium',
      reductionPercentage,
      mode: 'legacy'
    };

  } catch (error) {
    logger.error(`MPEG conversion error: ${error.message}`);
    throw error;
  }
};

/**
 * 1. MP4 to MPEG conversion
 */
export const convertMp4ToMpeg = async (inputPath, options = {}) => {
  logger.info('Starting MP4 to MPEG conversion');
  return await convertToMpeg(inputPath, options);
};

/**
 * 2. MKV to MPEG conversion
 */
export const convertMkvToMpeg = async (inputPath, options = {}) => {
  logger.info('Starting MKV to MPEG conversion');
  return await convertToMpeg(inputPath, options);
};

/**
 * 3. AVI to MPEG conversion
 */
export const convertAviToMpeg = async (inputPath, options = {}) => {
  logger.info('Starting AVI to MPEG conversion');
  return await convertToMpeg(inputPath, options);
};

/**
 * 4. WMV to MPEG conversion
 */
export const convertWmvToMpeg = async (inputPath, options = {}) => {
  logger.info('Starting WMV to MPEG conversion');
  return await convertToMpeg(inputPath, options);
};

/**
 * 5. MOV to MPEG conversion
 */
export const convertMovToMpeg = async (inputPath, options = {}) => {
  logger.info('Starting MOV to MPEG conversion');
  return await convertToMpeg(inputPath, options);
};

/**
 * 6. WEBM to MPEG conversion
 */
export const convertWebmToMpeg = async (inputPath, options = {}) => {
  logger.info('Starting WEBM to MPEG conversion');
  return await convertToMpeg(inputPath, options);
};

/**
 * 7. FLV to MPEG conversion
 */
export const convertFlvToMpeg = async (inputPath, options = {}) => {
  logger.info('Starting FLV to MPEG conversion');
  return await convertToMpeg(inputPath, options);
};

/**
 * 8. 3GP to MPEG conversion
 */
export const convert3gpToMpeg = async (inputPath, options = {}) => {
  logger.info('Starting 3GP to MPEG conversion');
  return await convertToMpeg(inputPath, options);
};

/**
 * 9. 3G2 to MPEG conversion
 */
export const convert3g2ToMpeg = async (inputPath, options = {}) => {
  logger.info('Starting 3G2 to MPEG conversion');
  return await convertToMpeg(inputPath, options);
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

export default {
  convertToMpeg,
  convertMp4ToMpeg,
  convertMkvToMpeg,
  convertAviToMpeg,
  convertWmvToMpeg,
  convertMovToMpeg,
  convertWebmToMpeg,
  convertFlvToMpeg,
  convert3gpToMpeg,
  convert3g2ToMpeg,
  getVideoMetadata,
  cleanupFile,
  cleanupOldFiles,
  MPEG_CONVERSION_PRESETS
};