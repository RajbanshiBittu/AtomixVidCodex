import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import {
  FFMPEG_CONFIG,
  MKV_CONVERSION_PRESETS,
  PATHS,
  getFormatByExtension
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
 * Build FFmpeg arguments for MKV conversion
 */
const buildMkvFFmpegArgs = (inputPath, outputPath, options = {}) => {
  const {
    quality = 'medium',
    preserveMetadata = true,
    reEncode = true // For MKV-to-MKV, allow stream copy option
  } = options;

  const preset = MKV_CONVERSION_PRESETS[quality] || MKV_CONVERSION_PRESETS.medium;
  const inputExt = path.extname(inputPath).toLowerCase();
  const formatInfo = getFormatByExtension(inputExt);

  const args = [
    '-i', inputPath
  ];

  // Special handling for MKV-to-MKV conversion
  if (formatInfo?.name === 'MKV' && !reEncode) {
    // Stream copy mode for MKV validation/remux
    args.push('-c', 'copy');
    logger.info('Using stream copy mode for MKV-to-MKV conversion');
  } else {
    // Full re-encoding with CRF
    args.push('-c:v', preset.videoCodec);
    args.push('-c:a', preset.audioCodec);
    args.push('-preset', preset.preset);

    // Use CRF for H.264 quality-based encoding (Variable Bitrate)
    // CRF 18 = visually lossless, CRF 23 = high quality, CRF 28 = acceptable quality
    args.push('-crf', preset.crf.toString());

    // Add H.264 profile and level for compatibility
    args.push('-profile:v', preset.profile);
    args.push('-level', preset.level);

    // Audio bitrate
    args.push('-b:a', preset.audioBitrate);

    // Pixel format for compatibility
    args.push('-pix_fmt', 'yuv420p');

    // AAC audio settings
    args.push('-ar', '48000'); // Sample rate
    args.push('-ac', '2'); // Stereo
  }

  // Add format-specific optimizations
  if (formatInfo) {
    switch (formatInfo.name) {
      case 'WEBM':
        // WEBM might need dimension adjustment for VP8/VP9
        if (reEncode) {
          args.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2');
        }
        break;
      case 'AVI':
        // AVI might have odd dimensions
        if (reEncode) {
          args.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2');
        }
        break;
      case 'MOV':
        // MOV/QuickTime - high quality source
        if (reEncode) {
          args.push('-qscale:v', '2');
        }
        break;
      case 'MP4':
        // MP4 is usually well-structured, standard conversion
        break;
      case 'MKV':
        // MKV may have multiple tracks - map explicitly
        if (reEncode) {
          args.push('-map', '0:v:0', '-map', '0:a:0');
        }
        break;
    }
  }

  // Matroska-specific flags
  args.push('-f', 'matroska');

  // Preserve metadata if requested
  if (preserveMetadata) {
    args.push('-map_metadata', '0');
  }

  // Preserve chapters and attachments for MKV
  args.push('-map_chapters', '0');

  // Error handling and compatibility
  args.push('-max_muxing_queue_size', '1024');
  args.push('-y'); // Overwrite output file

  args.push(outputPath);

  return args;
};

/**
 * Core MKV conversion function
 */
export const convertToMkv = async (inputPath, options = {}) => {
  try {
    await ensureOutputDir();

    const inputFilename = path.basename(inputPath);
    const inputExt = path.extname(inputPath);
    const outputFilename = `${uuidv4()}.mkv`;
    const outputPath = path.join(PATHS.outputs, outputFilename);

    logger.info(`Starting MKV conversion: ${inputFilename} -> ${outputFilename}`);
    logger.info(`Input format: ${inputExt}, Quality: ${options.quality || 'medium'}`);

    // Get input video metadata
    let metadata;
    try {
      metadata = await getVideoMetadata(inputPath);
      logger.info(`Input video duration: ${metadata.format.duration}s, size: ${metadata.format.size} bytes`);
    } catch (error) {
      logger.warn(`Could not retrieve metadata: ${error.message}`);
    }

    // Build FFmpeg arguments
    const args = buildMkvFFmpegArgs(inputPath, outputPath, options);
    
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
          logger.info(`MKV Progress: frame=${conversionProgress.frame}, time=${conversionProgress.time}, speed=${conversionProgress.speed}`);
        }
      });

      ffmpeg.on('close', (code) => {
        clearTimeout(timeout);

        if (code === 0) {
          logger.info(`MKV conversion successful: ${outputFilename}`);
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
      reductionPercentage
    };

  } catch (error) {
    logger.error(`MKV conversion error: ${error.message}`);
    throw error;
  }
};

/**
 * 1. MP4 to MKV conversion
 */
export const convertMp4ToMkv = async (inputPath, options = {}) => {
  logger.info('Starting MP4 to MKV conversion');
  return await convertToMkv(inputPath, { ...options, reEncode: true });
};

/**
 * 2. MKV to MKV conversion (re-encode/optimize)
 */
export const convertMkvToMkv = async (inputPath, options = {}) => {
  logger.info('Starting MKV to MKV conversion (re-encode)');
  return await convertToMkv(inputPath, { ...options, reEncode: true });
};

/**
 * 3. AVI to MKV conversion
 */
export const convertAviToMkv = async (inputPath, options = {}) => {
  logger.info('Starting AVI to MKV conversion');
  return await convertToMkv(inputPath, { ...options, reEncode: true });
};

/**
 * 4. WEBM to MKV conversion
 */
export const convertWebmToMkv = async (inputPath, options = {}) => {
  logger.info('Starting WEBM to MKV conversion');
  return await convertToMkv(inputPath, { ...options, reEncode: true });
};

/**
 * 5. MOV to MKV conversion
 */
export const convertMovToMkv = async (inputPath, options = {}) => {
  logger.info('Starting MOV to MKV conversion');
  return await convertToMkv(inputPath, { ...options, reEncode: true });
};

/**
 * 6. WMV to MKV conversion
 */
export const convertWmvToMkv = async (inputPath, options = {}) => {
  logger.info('Starting WMV to MKV conversion');
  return await convertToMkv(inputPath, { ...options, reEncode: true });
};

/**
 * 7. MPEG to MKV conversion
 */
export const convertMpegToMkv = async (inputPath, options = {}) => {
  logger.info('Starting MPEG to MKV conversion');
  return await convertToMkv(inputPath, { ...options, reEncode: true });
};

/**
 * 8. FLV to MKV conversion
 */
export const convertFlvToMkv = async (inputPath, options = {}) => {
  logger.info('Starting FLV to MKV conversion');
  return await convertToMkv(inputPath, { ...options, reEncode: true });
};

/**
 * 9. 3GP to MKV conversion
 */
export const convert3gpToMkv = async (inputPath, options = {}) => {
  logger.info('Starting 3GP to MKV conversion');
  return await convertToMkv(inputPath, { ...options, reEncode: true });
};

/**
 * 10. 3G2 to MKV conversion
 */
export const convert3g2ToMkv = async (inputPath, options = {}) => {
  logger.info('Starting 3G2 to MKV conversion');
  return await convertToMkv(inputPath, { ...options, reEncode: true });
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
  convertToMkv,
  convertMp4ToMkv,
  convertMkvToMkv,
  convertAviToMkv,
  convertWebmToMkv,
  convertMovToMkv,
  convertWmvToMkv,
  convertMpegToMkv,
  convertFlvToMkv,
  convert3gpToMkv,
  convert3g2ToMkv,
  getVideoMetadata,
  cleanupFile,
  cleanupOldFiles
};
