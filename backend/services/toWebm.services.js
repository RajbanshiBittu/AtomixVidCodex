import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import {
  FFMPEG_CONFIG,
  WEBM_CONVERSION_PRESETS,
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
 * Build FFmpeg arguments for WebM conversion
 * Using CRF for VP9 with automatic bitrate calculation
 */
const buildWebmFFmpegArgs = (inputPath, outputPath, options = {}) => {
  const {
    quality = 'medium',
    metadata = null
  } = options;

  const preset = WEBM_CONVERSION_PRESETS[quality] || WEBM_CONVERSION_PRESETS.medium;

  const args = [
    '-i', inputPath,
    '-c:v', preset.videoCodec,
    '-c:a', preset.audioCodec
  ];

  // Use CRF for VP9 quality-based encoding (Variable Bitrate)
  // VP9 CRF range: 0-63 (0 = lossless, 23 = high quality, 31 = default, 37 = low quality)
  args.push('-crf', preset.crf.toString());

  // Audio bitrate
  args.push('-b:a', preset.audioBitrate);

  // VP9 specific settings
  args.push('-cpu-used', preset.speed.toString());
  args.push('-row-mt', '1'); // Enable row-based multithreading

  // Audio settings for Opus
  args.push('-ar', '48000'); // Opus works best at 48kHz

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

  // Apply video filters if any
  if (videoFilters.length > 0) {
    args.push('-vf', videoFilters.join(','));
  }

  // WebM container options
  args.push('-deadline', 'good'); // Quality/speed tradeoff
  args.push('-max_muxing_queue_size', '1024');
  args.push('-y'); // Overwrite output file

  args.push(outputPath);

  return args;
};

/**
 * Convert video to WebM
 */
export const convertToWebm = async (inputPath, options = {}) => {
  try {
    await ensureOutputDir();

    const inputFilename = path.basename(inputPath);
    const inputExt = path.extname(inputPath);
    const outputFilename = `${uuidv4()}.webm`;
    const outputPath = path.join(PATHS.outputs, outputFilename);

    logger.info(`Starting WebM conversion: ${inputFilename} -> ${outputFilename}`);
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
    const args = buildWebmFFmpegArgs(inputPath, outputPath, { ...options, metadata });
    
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
          logger.info(`WebM Progress: frame=${conversionProgress.frame}, time=${conversionProgress.time}, speed=${conversionProgress.speed}`);
        }
      });

      ffmpeg.on('close', (code) => {
        clearTimeout(timeout);

        if (code === 0) {
          logger.info(`WebM conversion successful: ${outputFilename}`);
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

    logger.info(`Output file size: ${outputStats.size} bytes`);

    return {
      success: true,
      outputPath,
      outputFilename,
      inputFilename,
      outputSize: outputStats.size,
      quality: options.quality || 'medium'
    };

  } catch (error) {
    logger.error(`WebM conversion error: ${error.message}`);
    throw error;
  }
};

/**
 * Convert MPEG to WebM (via MP4 intermediate)
 * MPEG -> MP4 -> WebM
 */
export const convertMpegToWebm = async (inputPath, options = {}) => {
  let intermediateMp4Path = null;
  
  try {
    await ensureOutputDir();

    logger.info('Starting MPEG to WebM conversion (via MP4 intermediate)');
    
    // Step 1: Convert MPEG to MP4
    logger.info('Step 1/2: Converting MPEG to MP4...');
    const mp4Result = await convertToMp4(inputPath, options);
    intermediateMp4Path = mp4Result.outputPath;
    
    logger.info(`Intermediate MP4 created: ${mp4Result.outputFilename}`);
    
    // Step 2: Convert MP4 to WebM
    logger.info('Step 2/2: Converting MP4 to WebM...');
    const webmResult = await convertToWebm(intermediateMp4Path, options);
    
    // Clean up intermediate MP4 file
    try {
      await fs.unlink(intermediateMp4Path);
      logger.info(`Cleaned up intermediate MP4: ${mp4Result.outputFilename}`);
    } catch (cleanupError) {
      logger.warn(`Failed to cleanup intermediate MP4: ${cleanupError.message}`);
    }
    
    logger.info('MPEG to WebM conversion completed successfully');
    
    return {
      success: true,
      outputPath: webmResult.outputPath,
      outputFilename: webmResult.outputFilename,
      inputFilename: path.basename(inputPath),
      outputSize: webmResult.outputSize,
      quality: options.quality || 'medium',
      conversionMethod: 'mpeg-mp4-webm'
    };

  } catch (error) {
    // Clean up intermediate file on error
    if (intermediateMp4Path) {
      try {
        await fs.unlink(intermediateMp4Path);
        logger.info('Cleaned up intermediate MP4 after error');
      } catch (cleanupError) {
        logger.warn(`Failed to cleanup intermediate MP4: ${cleanupError.message}`);
      }
    }
    
    logger.error(`MPEG to WebM conversion error: ${error.message}`);
    throw error;
  }
};

/**
 * Convert 3GP to WebM (via MP4 intermediate)
 * 3GP -> MP4 -> WebM
 */
export const convert3gpToWebm = async (inputPath, options = {}) => {
  let intermediateMp4Path = null;
  
  try {
    await ensureOutputDir();

    logger.info('Starting 3GP to WebM conversion (via MP4 intermediate)');
    
    // Step 1: Convert 3GP to MP4
    logger.info('Step 1/2: Converting 3GP to MP4...');
    const mp4Result = await convertToMp4(inputPath, options);
    intermediateMp4Path = mp4Result.outputPath;
    
    logger.info(`Intermediate MP4 created: ${mp4Result.outputFilename}`);
    
    // Step 2: Convert MP4 to WebM
    logger.info('Step 2/2: Converting MP4 to WebM...');
    const webmResult = await convertToWebm(intermediateMp4Path, options);
    
    // Clean up intermediate MP4 file
    try {
      await fs.unlink(intermediateMp4Path);
      logger.info(`Cleaned up intermediate MP4: ${mp4Result.outputFilename}`);
    } catch (cleanupError) {
      logger.warn(`Failed to cleanup intermediate MP4: ${cleanupError.message}`);
    }
    
    logger.info('3GP to WebM conversion completed successfully');
    
    return {
      success: true,
      outputPath: webmResult.outputPath,
      outputFilename: webmResult.outputFilename,
      inputFilename: path.basename(inputPath),
      outputSize: webmResult.outputSize,
      quality: options.quality || 'medium',
      conversionMethod: '3gp-mp4-webm'
    };

  } catch (error) {
    // Clean up intermediate file on error
    if (intermediateMp4Path) {
      try {
        await fs.unlink(intermediateMp4Path);
        logger.info('Cleaned up intermediate MP4 after error');
      } catch (cleanupError) {
        logger.warn(`Failed to cleanup intermediate MP4: ${cleanupError.message}`);
      }
    }
    
    logger.error(`3GP to WebM conversion error: ${error.message}`);
    throw error;
  }
};

/**
 * Convert 3G2 to WebM (via MP4 intermediate)
 * 3G2 -> MP4 -> WebM
 */
export const convert3g2ToWebm = async (inputPath, options = {}) => {
  let intermediateMp4Path = null;
  
  try {
    await ensureOutputDir();

    logger.info('Starting 3G2 to WebM conversion (via MP4 intermediate)');
    
    // Step 1: Convert 3G2 to MP4
    logger.info('Step 1/2: Converting 3G2 to MP4...');
    const mp4Result = await convertToMp4(inputPath, options);
    intermediateMp4Path = mp4Result.outputPath;
    
    logger.info(`Intermediate MP4 created: ${mp4Result.outputFilename}`);
    
    // Step 2: Convert MP4 to WebM
    logger.info('Step 2/2: Converting MP4 to WebM...');
    const webmResult = await convertToWebm(intermediateMp4Path, options);
    
    // Clean up intermediate MP4 file
    try {
      await fs.unlink(intermediateMp4Path);
      logger.info(`Cleaned up intermediate MP4: ${mp4Result.outputFilename}`);
    } catch (cleanupError) {
      logger.warn(`Failed to cleanup intermediate MP4: ${cleanupError.message}`);
    }
    
    logger.info('3G2 to WebM conversion completed successfully');
    
    return {
      success: true,
      outputPath: webmResult.outputPath,
      outputFilename: webmResult.outputFilename,
      inputFilename: path.basename(inputPath),
      outputSize: webmResult.outputSize,
      quality: options.quality || 'medium',
      conversionMethod: '3g2-mp4-webm'
    };

  } catch (error) {
    // Clean up intermediate file on error
    if (intermediateMp4Path) {
      try {
        await fs.unlink(intermediateMp4Path);
        logger.info('Cleaned up intermediate MP4 after error');
      } catch (cleanupError) {
        logger.warn(`Failed to cleanup intermediate MP4: ${cleanupError.message}`);
      }
    }
    
    logger.error(`3G2 to WebM conversion error: ${error.message}`);
    throw error;
  }
};

/**
 * Clean up file
 */
export const cleanupFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    logger.info(`Cleaned up file: ${filePath}`);
  } catch (error) {
    logger.error(`Failed to cleanup file ${filePath}: ${error.message}`);
  }
};

export default {
  convertToWebm,
  convertMpegToWebm,
  convert3gpToWebm,
  convert3g2ToWebm,
  getVideoMetadata,
  cleanupFile
};
