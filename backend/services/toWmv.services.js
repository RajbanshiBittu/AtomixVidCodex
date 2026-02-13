import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import {
  FFMPEG_CONFIG,
  WMV_CONVERSION_PRESETS,
  PATHS,
  getFormatByExtension,
  checkResolutionDownscaling,
  buildScaleFilter
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
 * Build FFmpeg arguments for WMV conversion
 */
const buildWmvFFmpegArgs = (inputPath, outputPath, options = {}) => {
  const {
    quality = 'medium',
    preserveMetadata = true,
    metadata = null
  } = options;

  const preset = WMV_CONVERSION_PRESETS[quality] || WMV_CONVERSION_PRESETS.medium;
  const inputExt = path.extname(inputPath).toLowerCase();
  const formatInfo = getFormatByExtension(inputExt);

  const args = [
    '-i', inputPath,
    '-c:v', preset.videoCodec,
    '-c:a', preset.audioCodec
  ];

  // WMV2 doesn't support CRF, use VBR with average bitrate target
  // Using -b:v as target average with -maxrate for VBR control
  args.push('-b:v', preset.avgBitrate);
  args.push('-b:a', preset.audioBitrate);

  // WMV-specific encoding settings for VBR
  args.push('-bufsize', preset.bufferSize);
  args.push('-maxrate', preset.maxRate);

  // Video settings for WMV compatibility
  args.push('-pix_fmt', 'yuv420p');
  args.push('-g', preset.gopSize.toString()); // GOP size for WMV

  // Audio settings for WMA compatibility
  args.push('-ar', '44100'); // Sample rate (WMV standard)
  args.push('-ac', '2'); // Stereo

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
      case 'MP4':
        // MP4 is usually well-structured
        args.push('-q:v', '3'); // Quality setting for MP4 source
        break;
      case 'MOV':
        // MOV/QuickTime optimization
        args.push('-q:v', '2'); // High quality for MOV source
        break;
      case 'MKV':
        // MKV might have multiple streams
        args.push('-map', '0:v:0', '-map', '0:a:0');
        break;
      case 'AVI':
        // AVI might need dimension adjustment
        if (videoFilters.length === 0) {
          videoFilters.push('scale=trunc(iw/2)*2:trunc(ih/2)*2');
        }
        break;
      case 'WEBM':
        // WEBM uses VP8/VP9, ensure compatible dimensions
        if (videoFilters.length === 0) {
          videoFilters.push('scale=trunc(iw/2)*2:trunc(ih/2)*2');
        }
        break;
      case 'MPEG':
        // MPEG might have interlaced content - use yadif deinterlacing filter
        if (videoFilters.length > 0) {
          videoFilters.unshift('yadif=0:-1:0');
        } else {
          videoFilters.push('yadif=0:-1:0', 'scale=trunc(iw/2)*2:trunc(ih/2)*2');
        }
        break;
    }
  }

  // Apply video filters if any
  if (videoFilters.length > 0) {
    args.push('-vf', videoFilters.join(','));
  }

  // ASF/WMV format specification
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
 * Core WMV conversion function
 */
export const convertToWmv = async (inputPath, options = {}) => {
  try {
    await ensureOutputDir();

    const inputFilename = path.basename(inputPath);
    const inputExt = path.extname(inputPath);
    const outputFilename = `${uuidv4()}.wmv`;
    const outputPath = path.join(PATHS.outputs, outputFilename);

    logger.info(`Starting WMV conversion: ${inputFilename} -> ${outputFilename}`);
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
    const args = buildWmvFFmpegArgs(inputPath, outputPath, { ...options, metadata });
    
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
          logger.info(`WMV Progress: frame=${conversionProgress.frame}, time=${conversionProgress.time}, speed=${conversionProgress.speed}`);
        }
      });

      ffmpeg.on('close', (code) => {
        clearTimeout(timeout);

        if (code === 0) {
          logger.info(`WMV conversion successful: ${outputFilename}`);
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
    logger.error(`WMV conversion error: ${error.message}`);
    throw error;
  }
};

/**
 * 1. MP4 to WMV conversion
 */
export const convertMp4ToWmv = async (inputPath, options = {}) => {
  logger.info('Starting MP4 to WMV conversion');
  return await convertToWmv(inputPath, options);
};

/**
 * 2. MKV to WMV conversion
 */
export const convertMkvToWmv = async (inputPath, options = {}) => {
  logger.info('Starting MKV to WMV conversion');
  return await convertToWmv(inputPath, options);
};

/**
 * 3. AVI to WMV conversion
 */
export const convertAviToWmv = async (inputPath, options = {}) => {
  logger.info('Starting AVI to WMV conversion');
  return await convertToWmv(inputPath, options);
};

/**
 * 4. WEBM to WMV conversion (via MP4 intermediate)
 * WEBM -> MP4 -> WMV for better compatibility
 */
export const convertWebmToWmv = async (inputPath, options = {}) => {
  let intermediateMp4Path = null;
  
  try {
    await ensureOutputDir();

    logger.info('Starting WEBM to WMV conversion (via MP4 intermediate)');
    
    // Step 1: Convert WEBM to MP4
    logger.info('Step 1/2: Converting WEBM to MP4...');
    const mp4Result = await convertToMp4(inputPath, options);
    intermediateMp4Path = mp4Result.outputPath;
    
    logger.info(`Intermediate MP4 created: ${mp4Result.outputFilename}`);
    
    // Step 2: Convert MP4 to WMV
    logger.info('Step 2/2: Converting MP4 to WMV...');
    const wmvResult = await convertToWmv(intermediateMp4Path, options);
    
    // Clean up intermediate MP4 file
    try {
      await fs.unlink(intermediateMp4Path);
      logger.info(`Cleaned up intermediate file: ${mp4Result.outputFilename}`);
    } catch (cleanupError) {
      logger.warn(`Failed to cleanup intermediate file: ${cleanupError.message}`);
    }
    
    logger.info('WEBM to WMV conversion completed successfully');
    
    return {
      ...wmvResult,
      conversionPath: 'WEBM -> MP4 -> WMV',
      intermediateFormat: 'MP4'
    };

  } catch (error) {
    logger.error(`WEBM to WMV conversion error: ${error.message}`);
    
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
 * 5. MOV to WMV conversion
 */
export const convertMovToWmv = async (inputPath, options = {}) => {
  logger.info('Starting MOV to WMV conversion');
  return await convertToWmv(inputPath, options);
};

/**
 * 6. MPEG to WMV conversion
 */
export const convertMpegToWmv = async (inputPath, options = {}) => {
  logger.info('Starting MPEG to WMV conversion');
  return await convertToWmv(inputPath, options);
};

/**
 * 7. FLV to WMV conversion (via MP4 intermediate)
 * FLV -> MP4 -> WMV for better compatibility
 */
export const convertFlvToWmv = async (inputPath, options = {}) => {
  let intermediateMp4Path = null;
  
  try {
    await ensureOutputDir();

    logger.info('Starting FLV to WMV conversion (via MP4 intermediate)');
    
    // Step 1: Convert FLV to MP4
    logger.info('Step 1/2: Converting FLV to MP4...');
    const mp4Result = await convertToMp4(inputPath, options);
    intermediateMp4Path = mp4Result.outputPath;
    
    logger.info(`Intermediate MP4 created: ${mp4Result.outputFilename}`);
    
    // Step 2: Convert MP4 to WMV
    logger.info('Step 2/2: Converting MP4 to WMV...');
    const wmvResult = await convertToWmv(intermediateMp4Path, options);
    
    // Clean up intermediate MP4 file
    try {
      await fs.unlink(intermediateMp4Path);
      logger.info(`Cleaned up intermediate file: ${mp4Result.outputFilename}`);
    } catch (cleanupError) {
      logger.warn(`Failed to cleanup intermediate file: ${cleanupError.message}`);
    }
    
    logger.info('FLV to WMV conversion completed successfully');
    
    return {
      ...wmvResult,
      conversionPath: 'FLV -> MP4 -> WMV',
      intermediateFormat: 'MP4'
    };

  } catch (error) {
    logger.error(`FLV to WMV conversion error: ${error.message}`);
    
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
 * 8. 3GP to WMV conversion (via MP4 intermediate)
 * 3GP -> MP4 -> WMV for better compatibility
 */
export const convert3gpToWmv = async (inputPath, options = {}) => {
  let intermediateMp4Path = null;
  
  try {
    await ensureOutputDir();

    logger.info('Starting 3GP to WMV conversion (via MP4 intermediate)');
    
    // Step 1: Convert 3GP to MP4
    logger.info('Step 1/2: Converting 3GP to MP4...');
    const mp4Result = await convertToMp4(inputPath, options);
    intermediateMp4Path = mp4Result.outputPath;
    
    logger.info(`Intermediate MP4 created: ${mp4Result.outputFilename}`);
    
    // Step 2: Convert MP4 to WMV
    logger.info('Step 2/2: Converting MP4 to WMV...');
    const wmvResult = await convertToWmv(intermediateMp4Path, options);
    
    // Clean up intermediate MP4 file
    try {
      await fs.unlink(intermediateMp4Path);
      logger.info(`Cleaned up intermediate file: ${mp4Result.outputFilename}`);
    } catch (cleanupError) {
      logger.warn(`Failed to cleanup intermediate file: ${cleanupError.message}`);
    }
    
    logger.info('3GP to WMV conversion completed successfully');
    
    return {
      ...wmvResult,
      conversionPath: '3GP -> MP4 -> WMV',
      intermediateFormat: 'MP4'
    };

  } catch (error) {
    logger.error(`3GP to WMV conversion error: ${error.message}`);
    
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
 * 9. 3G2 to WMV conversion (via MP4 intermediate)
 * 3G2 -> MP4 -> WMV for better compatibility
 */
export const convert3g2ToWmv = async (inputPath, options = {}) => {
  let intermediateMp4Path = null;
  
  try {
    await ensureOutputDir();

    logger.info('Starting 3G2 to WMV conversion (via MP4 intermediate)');
    
    // Step 1: Convert 3G2 to MP4
    logger.info('Step 1/2: Converting 3G2 to MP4...');
    const mp4Result = await convertToMp4(inputPath, options);
    intermediateMp4Path = mp4Result.outputPath;
    
    logger.info(`Intermediate MP4 created: ${mp4Result.outputFilename}`);
    
    // Step 2: Convert MP4 to WMV
    logger.info('Step 2/2: Converting MP4 to WMV...');
    const wmvResult = await convertToWmv(intermediateMp4Path, options);
    
    // Clean up intermediate MP4 file
    try {
      await fs.unlink(intermediateMp4Path);
      logger.info(`Cleaned up intermediate file: ${mp4Result.outputFilename}`);
    } catch (cleanupError) {
      logger.warn(`Failed to cleanup intermediate file: ${cleanupError.message}`);
    }
    
    logger.info('3G2 to WMV conversion completed successfully');
    
    return {
      ...wmvResult,
      conversionPath: '3G2 -> MP4 -> WMV',
      intermediateFormat: 'MP4'
    };

  } catch (error) {
    logger.error(`3G2 to WMV conversion error: ${error.message}`);
    
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
  convertToWmv,
  convertMp4ToWmv,
  convertMkvToWmv,
  convertAviToWmv,
  convertWebmToWmv,
  convertMovToWmv,
  convertMpegToWmv,
  convertFlvToWmv,
  convert3gpToWmv,
  convert3g2ToWmv,
  getVideoMetadata,
  cleanupFile,
  cleanupOldFiles,
  WMV_CONVERSION_PRESETS
};
