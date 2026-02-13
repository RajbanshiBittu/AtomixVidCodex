import path from 'path';
import {
  convertMp4ToMov,
  convertMkvToMov,
  convertAviToMov,
  convertWmvToMov,
  convertMpegToMov,
  convertFlvToMov,
  convertWebmToMov,
  convert3gpToMov,
  convert3g2ToMov,
  cleanupFile
} from '../services/toMov.services.js';
import { getFormatByExtension } from '../config/ffmpeg.js';
import logger from '../utils/logger.js';

/**
 * Base conversion controller logic for MOV conversions
 */
const handleMovConversion = async (req, res, expectedFormat, conversionFunction) => {
  const uploadedFile = req.file;
  
  try {
    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please upload a video file'
      });
    }

    const inputPath = uploadedFile.path;
    const inputExt = path.extname(uploadedFile.originalname).toLowerCase();
    const formatInfo = getFormatByExtension(inputExt);

    // Validate format matches expected
    if (formatInfo?.name !== expectedFormat) {
      await cleanupFile(inputPath);
      return res.status(400).json({
        success: false,
        error: 'Invalid format',
        message: `Expected ${expectedFormat} format, but received ${formatInfo?.name || 'unknown'} format`
      });
    }

    logger.info(`Processing ${formatInfo.name} to MOV conversion`);
    logger.info(`Original filename: ${uploadedFile.originalname}`);
    logger.info(`File size: ${uploadedFile.size} bytes`);

    // Get conversion options from validated query
    const conversionOptions = {
      quality: req.validatedQuery?.quality || 'medium',
      preserveMetadata: req.validatedQuery?.preserveMetadata !== false,
      customBitrate: req.validatedQuery?.customBitrate || null
    };

    // Perform conversion
    const result = await conversionFunction(inputPath, conversionOptions);

    // Clean up uploaded file
    await cleanupFile(inputPath);

    // Build response
    const response = {
      success: true,
      message: `${formatInfo.name} converted to MOV successfully`,
      data: {
        inputFormat: formatInfo.name,
        inputFilename: uploadedFile.originalname,
        outputFilename: result.outputFilename,
        outputPath: path.join('..', 'outputs', result.outputFilename),
        outputSize: result.outputSize,
        quality: result.quality,
        reductionPercentage: result.reductionPercentage
      }
    };

    // Add conversion path for multi-step conversions
    if (result.conversionPath) {
      response.data.conversionPath = result.conversionPath;
      response.data.intermediateFormat = result.intermediateFormat;
    }

    res.status(200).json(response);

  } catch (error) {
    logger.error(`MOV conversion failed: ${error.message}`, {
      file: uploadedFile?.originalname,
      stack: error.stack,
      path: uploadedFile?.path,
      ip: req.ip
    });

    // Clean up uploaded file on error
    if (uploadedFile?.path) {
      await cleanupFile(uploadedFile.path).catch(err => 
        logger.error(`Failed to cleanup file: ${err.message}`)
      );
    }

    res.status(500).json({
      success: false,
      error: 'Conversion failed',
      message: 'An error occurred during video conversion. Please try again later.'
    });
  }
};

/**
 * 1. MP4 to MOV controller
 */
export const mp4ToMovController = async (req, res) => {
  await handleMovConversion(req, res, 'MP4', convertMp4ToMov);
};

/**
 * 2. MKV to MOV controller
 */
export const mkvToMovController = async (req, res) => {
  await handleMovConversion(req, res, 'MKV', convertMkvToMov);
};

/**
 * 3. AVI to MOV controller
 */
export const aviToMovController = async (req, res) => {
  await handleMovConversion(req, res, 'AVI', convertAviToMov);
};

/**
 * 4. WMV to MOV controller
 */
export const wmvToMovController = async (req, res) => {
  await handleMovConversion(req, res, 'WMV', convertWmvToMov);
};

/**
 * 5. MPEG to MOV controller
 */
export const mpegToMovController = async (req, res) => {
  await handleMovConversion(req, res, 'MPEG', convertMpegToMov);
};

/**
 * 6. FLV to MOV controller (via MP4 intermediate)
 */
export const flvToMovController = async (req, res) => {
  await handleMovConversion(req, res, 'FLV', convertFlvToMov);
};

/**
 * 7. WEBM to MOV controller (via MP4 intermediate)
 */
export const webmToMovController = async (req, res) => {
  await handleMovConversion(req, res, 'WEBM', convertWebmToMov);
};

/**
 * 8. 3GP to MOV controller (via MP4 intermediate)
 */
export const threeGpToMovController = async (req, res) => {
  await handleMovConversion(req, res, '3GP', convert3gpToMov);
};

/**
 * 9. 3G2 to MOV controller (via MP4 intermediate)
 */
export const threeG2ToMovController = async (req, res) => {
  await handleMovConversion(req, res, '3G2', convert3g2ToMov);
};

export default {
  mp4ToMovController,
  mkvToMovController,
  aviToMovController,
  wmvToMovController,
  mpegToMovController,
  flvToMovController,
  webmToMovController,
  threeGpToMovController,
  threeG2ToMovController
};
