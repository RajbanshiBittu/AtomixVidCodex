import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import {
  FFMPEG_CONFIG,
  THREE_GP_CONVERSION_PRESETS,
  PATHS,
  getFormatByExtension
} from '../config/ffmpeg.js';
import logger from '../utils/logger.js';
import { convertToMp4 } from './toMp4.services.js';

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
 * Build FFmpeg arguments for 3GP conversion
 */
const build3gpFFmpegArgs = (inputPath, outputPath, options = {}) => {
  const {
    quality = 'medium',
    preserveMetadata = true
  } = options;

  const preset = THREE_GP_CONVERSION_PRESETS[quality] || THREE_GP_CONVERSION_PRESETS.medium;
  const inputExt = path.extname(inputPath).toLowerCase();
  const formatInfo = getFormatByExtension(inputExt);

  const args = [
    '-i', inputPath,
    '-c:v', preset.videoCodec,
    '-c:a', preset.audioCodec,
    '-preset', preset.preset
  ];

  // Use CRF for H.264 quality-based encoding (Variable Bitrate)
  args.push('-crf', preset.crf.toString());

  // Add H.264 profile and level for mobile compatibility
  args.push('-profile:v', preset.profile);
  args.push('-level', preset.level);

  // Audio bitrate
  args.push('-b:a', preset.audioBitrate);

  // Scale video to mobile-friendly resolution
  args.push('-vf', `scale='min(${preset.maxWidth},iw)':'min(${preset.maxHeight},ih)':force_original_aspect_ratio=decrease,pad=${preset.maxWidth}:${preset.maxHeight}:(ow-iw)/2:(oh-ih)/2`);

  // Pixel format for compatibility
  args.push('-pix_fmt', 'yuv420p');

  // AAC audio settings for 3GP
  args.push('-ar', '22050'); // Sample rate (3GP standard)
  args.push('-ac', '1'); // Mono for smaller file size

  // Frame rate for mobile devices
  args.push('-r', '15');

  // Add format-specific optimizations
  if (formatInfo) {
    switch (formatInfo.name) {
      case 'WMV':
      case 'FLV':
        // May need deinterlacing — use the yadif filter appended to existing -vf
        {
          const vfIndex = args.findIndex(a => a === '-vf');
          if (vfIndex !== -1 && typeof args[vfIndex + 1] === 'string') {
            args[vfIndex + 1] = `${args[vfIndex + 1]},yadif=0:-1:0`;
          } else {
            args.push('-vf', 'yadif=0:-1:0');
          }
        }
        break;
      case 'MKV':
        // MKV might have multiple audio tracks
        args.push('-map', '0:v:0', '-map', '0:a:0');
        break;
      case 'WEBM':
        // WebM to 3GP
        args.push('-strict', 'experimental');
        break;
    }
  }

  // 3GP format specification
  args.push('-f', '3gp');

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
 * Core 3GP conversion function
 */
export const convertTo3gp = async (inputPath, options = {}) => {
  try {
    await ensureOutputDir();

    const inputFilename = path.basename(inputPath);
    const inputExt = path.extname(inputPath);
    const outputFilename = `${uuidv4()}.3gp`;
    const outputPath = path.join(PATHS.outputs, outputFilename);

    logger.info(`Starting 3GP conversion: ${inputFilename} -> ${outputFilename}`);
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
    const args = build3gpFFmpegArgs(inputPath, outputPath, options);
    
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
          logger.info(`3GP Progress: frame=${conversionProgress.frame}, time=${conversionProgress.time}, speed=${conversionProgress.speed}`);
        }
      });

      ffmpeg.on('close', (code) => {
        clearTimeout(timeout);

        if (code === 0) {
          logger.info(`3GP conversion successful: ${outputFilename}`);
          resolve({
            success: true,
            outputPath,
            outputFilename,
            progress: conversionProgress
          });
        } else {
          logger.error(`FFmpeg exited with code ${code}`);
          logger.error(`FFmpeg stderr: ${stderr}`);
          reject(new Error(`3GP conversion failed with code ${code}`));
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
    logger.error(`3GP conversion error: ${error.message}`);
    throw error;
  }
};

/**
 * 1. MP4 to 3GP conversion
 */
export const convertMp4To3gp = async (inputPath, options = {}) => {
  logger.info('Starting MP4 to 3GP conversion');
  return await convertTo3gp(inputPath, options);
};

/**
 * 2. WEBM to 3GP conversion (via MP4 intermediate)
 * WEBM -> MP4 -> 3GP for better compatibility
 */
export const convertWebmTo3gp = async (inputPath, options = {}) => {
  let intermediateMp4Path = null;
  
  try {
    await ensureOutputDir();

    logger.info('Starting WEBM to 3GP conversion (via MP4 intermediate)');
    
    // Step 1: Convert WEBM to MP4
    logger.info('Step 1/2: Converting WEBM to MP4...');
    const mp4Result = await convertToMp4(inputPath, options);
    intermediateMp4Path = mp4Result.outputPath;
    
    logger.info(`Intermediate MP4 created: ${mp4Result.outputFilename}`);
    
    // Step 2: Convert MP4 to 3GP
    logger.info('Step 2/2: Converting MP4 to 3GP...');
    const result3gp = await convertTo3gp(intermediateMp4Path, options);
    
    // Clean up intermediate MP4 file
    try {
      await fs.unlink(intermediateMp4Path);
      logger.info(`Cleaned up intermediate MP4: ${mp4Result.outputFilename}`);
    } catch (cleanupError) {
      logger.warn(`Failed to cleanup intermediate MP4: ${cleanupError.message}`);
    }
    
    logger.info('WEBM to 3GP conversion completed successfully');
    
    return {
      ...result3gp,
      inputFilename: path.basename(inputPath),
      conversionMethod: 'webm-mp4-3gp'
    };

  } catch (error) {
    if (intermediateMp4Path) {
      try {
        await fs.unlink(intermediateMp4Path);
      } catch {}
    }
    logger.error(`WEBM to 3GP conversion error: ${error.message}`);
    throw error;
  }
};

/**
 * 3. AVI to 3GP conversion
 */
export const convertAviTo3gp = async (inputPath, options = {}) => {
  logger.info('Starting AVI to 3GP conversion');
  return await convertTo3gp(inputPath, options);
};

/**
 * 4. MOV to 3GP conversion
 */
export const convertMovTo3gp = async (inputPath, options = {}) => {
  logger.info('Starting MOV to 3GP conversion');
  return await convertTo3gp(inputPath, options);
};

/**
 * 5. MKV to 3GP conversion
 */
export const convertMkvTo3gp = async (inputPath, options = {}) => {
  logger.info('Starting MKV to 3GP conversion');
  return await convertTo3gp(inputPath, options);
};

/**
 * 6. WMV to 3GP conversion
 */
export const convertWmvTo3gp = async (inputPath, options = {}) => {
  logger.info('Starting WMV to 3GP conversion');
  return await convertTo3gp(inputPath, options);
};

/**
 * 7. FLV to 3GP conversion
 */
export const convertFlvTo3gp = async (inputPath, options = {}) => {
  logger.info('Starting FLV to 3GP conversion');
  return await convertTo3gp(inputPath, options);
};

/**
 * 8. MPEG to 3GP conversion
 */
export const convertMpegTo3gp = async (inputPath, options = {}) => {
  logger.info('Starting MPEG to 3GP conversion');
  return await convertTo3gp(inputPath, options);
};

/**
 * 9. 3G2 to 3GP conversion
 */
export const convert3g2To3gp = async (inputPath, options = {}) => {
  logger.info('Starting 3G2 to 3GP conversion');
  return await convertTo3gp(inputPath, options);
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
  convertTo3gp,
  convertMp4To3gp,
  convertWebmTo3gp,
  convertAviTo3gp,
  convertMovTo3gp,
  convertMkvTo3gp,
  convertWmvTo3gp,
  convertFlvTo3gp,
  convertMpegTo3gp,
  convert3g2To3gp,
  getVideoMetadata,
  cleanupFile,
  cleanupOldFiles,
  THREE_GP_CONVERSION_PRESETS
};
