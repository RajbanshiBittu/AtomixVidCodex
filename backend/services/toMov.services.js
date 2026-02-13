import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import {
  FFMPEG_CONFIG,
  MOV_CONVERSION_PRESETS,
  PATHS,
  getFormatByExtension
} from '../config/ffmpeg.js';
import { convertToMp4 } from './toMp4.services.js';
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
 * Build FFmpeg arguments for MOV conversion
 */
const buildMovFFmpegArgs = (inputPath, outputPath, options = {}) => {
  const {
    quality = 'medium',
    preserveMetadata = true
  } = options;

  const preset = MOV_CONVERSION_PRESETS[quality] || MOV_CONVERSION_PRESETS.medium;
  const inputExt = path.extname(inputPath).toLowerCase();
  const formatInfo = getFormatByExtension(inputExt);

  const args = [
    '-i', inputPath,
    '-c:v', preset.videoCodec,
    '-c:a', preset.audioCodec,
    '-preset', preset.preset
  ];

  // Use CRF for H.264 quality-based encoding (Variable Bitrate)
  // CRF 18 = visually lossless, CRF 23 = high quality, CRF 28 = acceptable quality
  args.push('-crf', preset.crf.toString());

  // Add H.264 profile and level for compatibility
  args.push('-profile:v', preset.profile);
  args.push('-level', preset.level);

  // Audio bitrate
  args.push('-b:a', preset.audioBitrate);

  // Pixel format for QuickTime compatibility
  args.push('-pix_fmt', 'yuv420p');

  // AAC audio settings for better compatibility
  args.push('-ar', '48000'); // Sample rate
  args.push('-ac', '2'); // Stereo

  // Add format-specific optimizations
  if (formatInfo) {
    switch (formatInfo.name) {
      case 'FLV':
        // FLV might need audio resampling
        args.push('-af', 'aresample=async=1');
        break;
      case 'WMV':
        // WMV might need frame rate adjustment
        args.push('-r', '30');
        break;
      case 'MPEG':
        // MPEG might have odd dimensions
        args.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2');
        break;
      case 'WEBM':
      case '3GP':
      case '3G2':
        // Ensure even dimensions
        args.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2');
        break;
    }
  }

  // QuickTime-specific flags for better compatibility
  args.push('-movflags', '+faststart');
  args.push('-f', 'mov');

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
 * Core MOV conversion function
 */
export const convertToMov = async (inputPath, options = {}) => {
  try {
    await ensureOutputDir();

    const inputFilename = path.basename(inputPath);
    const inputExt = path.extname(inputPath);
    const outputFilename = `${uuidv4()}.mov`;
    const outputPath = path.join(PATHS.outputs, outputFilename);

    logger.info(`Starting MOV conversion: ${inputFilename} -> ${outputFilename}`);
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
    const args = buildMovFFmpegArgs(inputPath, outputPath, options);
    
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
          logger.info(`MOV Progress: frame=${conversionProgress.frame}, time=${conversionProgress.time}, speed=${conversionProgress.speed}`);
        }
      });

      ffmpeg.on('close', (code) => {
        clearTimeout(timeout);

        if (code === 0) {
          logger.info(`MOV conversion successful: ${outputFilename}`);
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
    logger.error(`MOV conversion error: ${error.message}`);
    throw error;
  }
};

/**
 * 1. MP4 to MOV conversion
 */
export const convertMp4ToMov = async (inputPath, options = {}) => {
  logger.info('Starting MP4 to MOV conversion');
  return await convertToMov(inputPath, options);
};

/**
 * 2. MKV to MOV conversion
 */
export const convertMkvToMov = async (inputPath, options = {}) => {
  logger.info('Starting MKV to MOV conversion');
  return await convertToMov(inputPath, options);
};

/**
 * 3. AVI to MOV conversion
 */
export const convertAviToMov = async (inputPath, options = {}) => {
  logger.info('Starting AVI to MOV conversion');
  return await convertToMov(inputPath, options);
};

/**
 * 4. WMV to MOV conversion
 */
export const convertWmvToMov = async (inputPath, options = {}) => {
  logger.info('Starting WMV to MOV conversion');
  return await convertToMov(inputPath, options);
};

/**
 * 5. MPEG to MOV conversion
 */
export const convertMpegToMov = async (inputPath, options = {}) => {
  logger.info('Starting MPEG to MOV conversion');
  return await convertToMov(inputPath, options);
};

/**
 * 6. FLV to MOV conversion (via MP4 intermediate)
 * FLV -> MP4 -> MOV for better quality and compatibility
 */
export const convertFlvToMov = async (inputPath, options = {}) => {
  let intermediateMp4Path = null;
  
  try {
    await ensureOutputDir();

    logger.info('Starting FLV to MOV conversion (via MP4 intermediate)');
    
    // Step 1: Convert FLV to MP4
    logger.info('Step 1/2: Converting FLV to MP4...');
    const mp4Result = await convertToMp4(inputPath, options);
    intermediateMp4Path = mp4Result.outputPath;
    
    logger.info(`Intermediate MP4 created: ${mp4Result.outputFilename}`);
    
    // Step 2: Convert MP4 to MOV
    logger.info('Step 2/2: Converting MP4 to MOV...');
    const movResult = await convertToMov(intermediateMp4Path, options);
    
    // Clean up intermediate MP4 file
    try {
      await fs.unlink(intermediateMp4Path);
      logger.info(`Cleaned up intermediate file: ${mp4Result.outputFilename}`);
    } catch (cleanupError) {
      logger.warn(`Failed to cleanup intermediate file: ${cleanupError.message}`);
    }
    
    logger.info('FLV to MOV conversion completed successfully');
    
    return {
      ...movResult,
      conversionPath: 'FLV -> MP4 -> MOV',
      intermediateFormat: 'MP4'
    };

  } catch (error) {
    logger.error(`FLV to MOV conversion error: ${error.message}`);
    
    // Clean up intermediate file on error
    if (intermediateMp4Path) {
      try {
        await fs.unlink(intermediateMp4Path);
      } catch (cleanupError) {
        logger.warn(`Failed to cleanup intermediate file on error: ${cleanupError.message}`);
      }
    }
    
    throw error;
  }
};

/**
 * 7. WEBM to MOV conversion (via MP4 intermediate)
 * WEBM -> MP4 -> MOV for better compatibility
 */
export const convertWebmToMov = async (inputPath, options = {}) => {
  let intermediateMp4Path = null;
  
  try {
    await ensureOutputDir();

    logger.info('Starting WEBM to MOV conversion (via MP4 intermediate)');
    
    // Step 1: Convert WEBM to MP4
    logger.info('Step 1/2: Converting WEBM to MP4...');
    const mp4Result = await convertToMp4(inputPath, options);
    intermediateMp4Path = mp4Result.outputPath;
    
    logger.info(`Intermediate MP4 created: ${mp4Result.outputFilename}`);
    
    // Step 2: Convert MP4 to MOV
    logger.info('Step 2/2: Converting MP4 to MOV...');
    const movResult = await convertToMov(intermediateMp4Path, options);
    
    // Clean up intermediate MP4 file
    try {
      await fs.unlink(intermediateMp4Path);
      logger.info(`Cleaned up intermediate file: ${mp4Result.outputFilename}`);
    } catch (cleanupError) {
      logger.warn(`Failed to cleanup intermediate file: ${cleanupError.message}`);
    }
    
    logger.info('WEBM to MOV conversion completed successfully');
    
    return {
      ...movResult,
      conversionPath: 'WEBM -> MP4 -> MOV',
      intermediateFormat: 'MP4'
    };

  } catch (error) {
    logger.error(`WEBM to MOV conversion error: ${error.message}`);
    
    // Clean up intermediate file on error
    if (intermediateMp4Path) {
      try {
        await fs.unlink(intermediateMp4Path);
      } catch (cleanupError) {
        logger.warn(`Failed to cleanup intermediate file on error: ${cleanupError.message}`);
      }
    }
    
    throw error;
  }
};

/**
 * 8. 3GP to MOV conversion (via MP4 intermediate)
 * 3GP -> MP4 -> MOV for better quality
 */
export const convert3gpToMov = async (inputPath, options = {}) => {
  let intermediateMp4Path = null;
  
  try {
    await ensureOutputDir();

    logger.info('Starting 3GP to MOV conversion (via MP4 intermediate)');
    
    // Step 1: Convert 3GP to MP4
    logger.info('Step 1/2: Converting 3GP to MP4...');
    const mp4Result = await convertToMp4(inputPath, options);
    intermediateMp4Path = mp4Result.outputPath;
    
    logger.info(`Intermediate MP4 created: ${mp4Result.outputFilename}`);
    
    // Step 2: Convert MP4 to MOV
    logger.info('Step 2/2: Converting MP4 to MOV...');
    const movResult = await convertToMov(intermediateMp4Path, options);
    
    // Clean up intermediate MP4 file
    try {
      await fs.unlink(intermediateMp4Path);
      logger.info(`Cleaned up intermediate file: ${mp4Result.outputFilename}`);
    } catch (cleanupError) {
      logger.warn(`Failed to cleanup intermediate file: ${cleanupError.message}`);
    }
    
    logger.info('3GP to MOV conversion completed successfully');
    
    return {
      ...movResult,
      conversionPath: '3GP -> MP4 -> MOV',
      intermediateFormat: 'MP4'
    };

  } catch (error) {
    logger.error(`3GP to MOV conversion error: ${error.message}`);
    
    // Clean up intermediate file on error
    if (intermediateMp4Path) {
      try {
        await fs.unlink(intermediateMp4Path);
      } catch (cleanupError) {
        logger.warn(`Failed to cleanup intermediate file on error: ${cleanupError.message}`);
      }
    }
    
    throw error;
  }
};

/**
 * 9. 3G2 to MOV conversion (via MP4 intermediate)
 * 3G2 -> MP4 -> MOV for better quality
 */
export const convert3g2ToMov = async (inputPath, options = {}) => {
  let intermediateMp4Path = null;
  
  try {
    await ensureOutputDir();

    logger.info('Starting 3G2 to MOV conversion (via MP4 intermediate)');
    
    // Step 1: Convert 3G2 to MP4
    logger.info('Step 1/2: Converting 3G2 to MP4...');
    const mp4Result = await convertToMp4(inputPath, options);
    intermediateMp4Path = mp4Result.outputPath;
    
    logger.info(`Intermediate MP4 created: ${mp4Result.outputFilename}`);
    
    // Step 2: Convert MP4 to MOV
    logger.info('Step 2/2: Converting MP4 to MOV...');
    const movResult = await convertToMov(intermediateMp4Path, options);
    
    // Clean up intermediate MP4 file
    try {
      await fs.unlink(intermediateMp4Path);
      logger.info(`Cleaned up intermediate file: ${mp4Result.outputFilename}`);
    } catch (cleanupError) {
      logger.warn(`Failed to cleanup intermediate file: ${cleanupError.message}`);
    }
    
    logger.info('3G2 to MOV conversion completed successfully');
    
    return {
      ...movResult,
      conversionPath: '3G2 -> MP4 -> MOV',
      intermediateFormat: 'MP4'
    };

  } catch (error) {
    logger.error(`3G2 to MOV conversion error: ${error.message}`);
    
    // Clean up intermediate file on error
    if (intermediateMp4Path) {
      try {
        await fs.unlink(intermediateMp4Path);
      } catch (cleanupError) {
        logger.warn(`Failed to cleanup intermediate file on error: ${cleanupError.message}`);
      }
    }
    
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

export default {
  convertToMov,
  convertMp4ToMov,
  convertMkvToMov,
  convertAviToMov,
  convertWmvToMov,
  convertMpegToMov,
  convertFlvToMov,
  convertWebmToMov,
  convert3gpToMov,
  convert3g2ToMov,
  getVideoMetadata,
  cleanupFile,
  cleanupOldFiles,
  MOV_CONVERSION_PRESETS
};