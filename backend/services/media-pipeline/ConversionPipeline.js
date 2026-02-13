/**
 * ConversionPipeline - Orchestrates media conversion workflow
 * 
 * Coordinates all pipeline stages:
 * 1. Pre-encoding validation (MediaValidator)
 * 2. Format capability check (FormatCapabilityMatrix)
 * 3. Resolution normalization (ResolutionNormalizer)
 * 4. Profile selection (EncodingProfileManager)
 * 5. FFmpeg execution
 * 6. Error abstraction (user-friendly errors)
 * 
 * Industry pattern: ETL (Extract-Transform-Load) for media
 */

import { MediaValidator } from './MediaValidator.js';
import { FormatCapabilityMatrix } from './FormatCapabilityMatrix.js';
import { ResolutionNormalizer } from './ResolutionNormalizer.js';
import { EncodingProfileManager } from './EncodingProfileManager.js';
import { spawn } from 'child_process';
import { FFMPEG_CONFIG } from '../../config/ffmpeg.js';
import logger from '../../utils/logger.js';

export class ConversionPipeline {
  /**
   * Execute full conversion pipeline
   */
  static async execute({
    inputPath,
    outputPath,
    targetFormat,
    profile = null,
    options = {}
  }) {
    const pipelineLog = {
      stages: [],
      startTime: Date.now(),
      inputPath,
      outputPath,
      targetFormat
    };

    try {
      // ============================================================
      // STAGE 1: PRE-ENCODING VALIDATION
      // ============================================================
      const validationStart = Date.now();
      logger.info('[Pipeline] Stage 1/5: Validating input file...', { inputPath });
      
      const validation = await MediaValidator.validate(inputPath);
      
      pipelineLog.stages.push({
        stage: 1,
        name: 'Validation',
        duration: Date.now() - validationStart,
        result: validation
      });

      if (!validation.isValid) {
        throw new Error(
          `Validation failed: ${validation.errors.join(', ')}`
        );
      }

      logger.info(`[Pipeline] ✓ Validation passed (${validation.duration}ms)`);

      // ============================================================
      // STAGE 2: FORMAT CAPABILITY CHECK
      // ============================================================
      const capabilityStart = Date.now();
      logger.info('[Pipeline] Stage 2/5: Checking format capabilities...', { targetFormat });
      
      const capabilities = FormatCapabilityMatrix.getCapabilities(targetFormat);
      
      if (!capabilities) {
        throw new Error(`Unsupported target format: ${targetFormat}`);
      }

      // Check if resolution is supported
      const videoStream = validation.metadata.streams.find(
        s => s.codec_type === 'video'
      );
      
      const resolutionSupported = FormatCapabilityMatrix.isResolutionSupported(
        targetFormat,
        videoStream.width,
        videoStream.height
      );

      pipelineLog.stages.push({
        stage: 2,
        name: 'Capability Check',
        duration: Date.now() - capabilityStart,
        result: {
          capabilities,
          resolutionSupported
        }
      });

      logger.info('[Pipeline] ✓ Format capabilities checked');

      // ============================================================
      // STAGE 3: RESOLUTION NORMALIZATION
      // ============================================================
      const normalizationStart = Date.now();
      logger.info('[Pipeline] Stage 3/5: Normalizing resolution...');
      
      const normalization = ResolutionNormalizer.normalize(
        validation.metadata,
        targetFormat
      );

      pipelineLog.stages.push({
        stage: 3,
        name: 'Resolution Normalization',
        duration: Date.now() - normalizationStart,
        result: normalization
      });

      if (normalization.adjusted) {
        logger.info(
          `[Pipeline] ⚠ Resolution adjusted: ${normalization.original.width}x${normalization.original.height} → ${normalization.normalized.width}x${normalization.normalized.height}`
        );
      } else {
        logger.info('[Pipeline] ✓ Resolution compatible (no adjustment needed)');
      }

      // ============================================================
      // STAGE 4: PROFILE SELECTION
      // ============================================================
      const profileStart = Date.now();
      logger.info('[Pipeline] Stage 4/5: Selecting encoding profile...');
      
      const selectedProfile = EncodingProfileManager.selectProfile(
        validation.metadata,
        targetFormat,
        profile
      );

      if (!selectedProfile) {
        throw new Error(
          `Could not select appropriate encoding profile for ${targetFormat}`
        );
      }

      pipelineLog.stages.push({
        stage: 4,
        name: 'Profile Selection',
        duration: Date.now() - profileStart,
        result: {
          profileId: selectedProfile.profileId,
          description: selectedProfile.description
        }
      });

      logger.info(
        `[Pipeline] ✓ Profile selected: ${selectedProfile.profileId} (${selectedProfile.description})`
      );

      // ============================================================
      // STAGE 5: FFMPEG EXECUTION
      // ============================================================
      const conversionStart = Date.now();
      logger.info('[Pipeline] Stage 5/5: Executing FFmpeg conversion...');
      
      // Build FFmpeg arguments from profile
      const ffmpegArgs = EncodingProfileManager.buildFFmpegArgsFromProfile(
        selectedProfile,
        inputPath,
        outputPath,
        normalization.adjusted ? normalization.normalized : null
      );

      logger.debug('[Pipeline] FFmpeg args:', { args: ffmpegArgs.join(' ') });

      // Execute FFmpeg
      const conversionResult = await this.executeFFmpeg(ffmpegArgs);

      pipelineLog.stages.push({
        stage: 5,
        name: 'FFmpeg Execution',
        duration: Date.now() - conversionStart,
        result: {
          success: true,
          outputPath: conversionResult.outputPath
        }
      });

      logger.info(`[Pipeline] ✓ Conversion completed (${Date.now() - conversionStart}ms)`);

      // ============================================================
      // PIPELINE COMPLETE
      // ============================================================
      pipelineLog.totalDuration = Date.now() - pipelineLog.startTime;
      pipelineLog.success = true;

      logger.info(`[Pipeline] ✓✓✓ COMPLETE ✓✓✓ Total: ${pipelineLog.totalDuration}ms`);

      return {
        success: true,
        outputPath: conversionResult.outputPath,
        pipeline: pipelineLog,
        profile: selectedProfile.profileId,
        adjustments: {
          resolutionAdjusted: normalization.adjusted,
          originalResolution: normalization.original,
          finalResolution: normalization.normalized
        }
      };

    } catch (error) {
      // ============================================================
      // ERROR HANDLING
      // ============================================================
      pipelineLog.totalDuration = Date.now() - pipelineLog.startTime;
      pipelineLog.success = false;
      pipelineLog.error = {
        message: error.message,
        stage: pipelineLog.stages.length + 1
      };

      logger.error(`[Pipeline] ✗ FAILED at stage ${pipelineLog.error.stage}:`, { error: error.message, stack: error.stack });

      // Abstract FFmpeg errors to user-friendly messages
      const userError = this.abstractError(error, pipelineLog);

      throw new Error(userError.message);
    }
  }

  /**
   * Execute FFmpeg with promise wrapper using spawn
   */
  static executeFFmpeg(args) {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(FFMPEG_CONFIG.path, args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;

        // Parse and log progress
        const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
        if (timeMatch) {
          logger.debug(`[FFmpeg] Progress: ${timeMatch[1]}`);
        }
      });

      ffmpeg.on('error', (error) => {
        logger.error('[FFmpeg] Process error:', { error: error.message });
        reject(error);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          logger.info('[FFmpeg] Conversion completed successfully');
          resolve({ outputPath: args[args.length - 1] });
        } else {
          logger.error(`[FFmpeg] Exited with code ${code}`, { stderr });
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Abstract technical errors to user-friendly messages
   */
  static abstractError(error, pipelineLog) {
    const errorMessage = error.message.toLowerCase();
    const failedStage = pipelineLog.stages[pipelineLog.stages.length - 1];

    // Validation errors
    if (failedStage?.name === 'Validation') {
      return {
        message: 'The input file is corrupted or invalid. Please check the file and try again.',
        technical: error.message,
        stage: 'Validation',
        suggestion: 'Verify file integrity, ensure it\'s a valid video file'
      };
    }

    // Capability errors
    if (failedStage?.name === 'Capability Check') {
      return {
        message: 'The input video format or resolution is not supported for the target format.',
        technical: error.message,
        stage: 'Capability Check',
        suggestion: 'Try a different output format or reduce input resolution'
      };
    }

    // Resolution errors
    if (failedStage?.name === 'Resolution Normalization') {
      return {
        message: 'Unable to adjust video resolution to match target format requirements.',
        technical: error.message,
        stage: 'Resolution Normalization',
        suggestion: 'Input resolution may be too high or unusual aspect ratio'
      };
    }

    // Profile errors
    if (failedStage?.name === 'Profile Selection') {
      return {
        message: 'Could not determine appropriate encoding settings for this conversion.',
        technical: error.message,
        stage: 'Profile Selection',
        suggestion: 'Specify encoding profile manually or use different target format'
      };
    }

    // FFmpeg errors
    if (errorMessage.includes('exit code 234')) {
      return {
        message: 'Video encoder initialization failed. The input may have incompatible properties for the target format.',
        technical: error.message,
        stage: 'FFmpeg Execution',
        suggestion: 'This usually indicates resolution or codec incompatibility. Pipeline should have caught this earlier.'
      };
    }

    if (errorMessage.includes('timeout')) {
      return {
        message: 'Conversion took too long and was stopped. Large or high-resolution files may require more processing time.',
        technical: error.message,
        stage: 'FFmpeg Execution',
        suggestion: 'Try reducing resolution or use a faster encoding preset'
      };
    }

    if (errorMessage.includes('no space left')) {
      return {
        message: 'Insufficient disk space to complete conversion.',
        technical: error.message,
        stage: 'FFmpeg Execution',
        suggestion: 'Free up disk space and try again'
      };
    }

    if (errorMessage.includes('permission denied')) {
      return {
        message: 'Cannot write output file due to permission issues.',
        technical: error.message,
        stage: 'FFmpeg Execution',
        suggestion: 'Check file/directory permissions'
      };
    }

    // Generic error
    return {
      message: 'An unexpected error occurred during video conversion. Please try again.',
      technical: error.message,
      stage: failedStage?.name || 'Unknown',
      suggestion: 'If problem persists, contact support with error details'
    };
  }

  /**
   * Quick conversion (bypass pipeline for simple formats)
   */
  static async quickConvert({ inputPath, outputPath, targetFormat, options = {} }) {
    logger.info('[Pipeline] Quick conversion mode (bypass validation)', { inputPath, outputPath, targetFormat });
    
    try {
      const args = ['-i', inputPath];

      // Simple codec mapping
      switch (targetFormat) {
        case 'mp4':
          args.push('-c:v', 'h264', '-c:a', 'aac');
          break;
        case 'webm':
          args.push('-c:v', 'vp9', '-c:a', 'opus');
          break;
        case 'avi':
          args.push('-c:v', 'mpeg4', '-c:a', 'mp3');
          break;
        default:
          args.push('-c:v', 'copy', '-c:a', 'copy');
      }

      args.push('-y', outputPath);

      const result = await this.executeFFmpeg(args);

      return {
        success: true,
        outputPath: result.outputPath,
        mode: 'quick'
      };

    } catch (error) {
      throw new Error(`Quick conversion failed: ${error.message}`);
    }
  }
}

export default ConversionPipeline;
