import {
  convertMp4ToWmv,
  convertMkvToWmv,
  convertAviToWmv,
  convertWebmToWmv,
  convertMovToWmv,
  convertMpegToWmv,
  convertFlvToWmv,
  convert3gpToWmv,
  convert3g2ToWmv,
  cleanupFile
} from '../services/toWmv.services.js';
import { getFormatByExtension } from '../config/ffmpeg.js';
import path from 'path';
import logger from '../utils/logger.js';

/**
 * Base handler for WMV conversion
 */
const handleWmvConversion = async (req, res, inputFormat, conversionFunction) => {
  try {
    // Check if file was uploaded
    const uploadedFile = req.file;
    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please provide a video file'
      });
    }

    const inputPath = uploadedFile.path;
    const inputExt = path.extname(uploadedFile.originalname).toLowerCase();
    const formatInfo = getFormatByExtension(inputExt);

    if (!formatInfo) {
      await cleanupFile(inputPath);
      return res.status(400).json({
        success: false,
        error: 'Unsupported format',
        message: `File format ${inputExt} is not supported`
      });
    }

    logger.info(`Processing ${formatInfo.name} to WMV conversion`);
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

    // Return success response
    res.status(200).json({
      success: true,
      message: `${formatInfo.name} converted to WMV successfully`,
      data: {
        inputFormat: formatInfo.name,
        inputFilename: uploadedFile.originalname,
        outputFilename: result.outputFilename,
        outputPath: path.join('..', 'outputs', result.outputFilename),
        outputSize: result.outputSize,
        quality: result.quality,
        reductionPercentage: result.reductionPercentage,
        conversionPath: result.conversionPath || 'Direct'
      }
    });

  } catch (error) {
    logger.error(`WMV conversion error: ${error.message}`, {
      stack: error.stack,
      file: req.file?.originalname,
      path: req.file?.path,
      ip: req.ip
    });

    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      await cleanupFile(req.file.path).catch(err => {
        logger.error(`Failed to cleanup file on error: ${err.message}`);
      });
    }

    res.status(500).json({
      success: false,
      error: 'Conversion failed',
      message: 'An error occurred during video conversion. Please try again later.'
    });
  }
};

/**
 * 1. MP4 to WMV controller
 */
export const mp4ToWmvController = async (req, res) => {
  await handleWmvConversion(req, res, 'MP4', convertMp4ToWmv);
};

/**
 * 2. MKV to WMV controller
 */
export const mkvToWmvController = async (req, res) => {
  await handleWmvConversion(req, res, 'MKV', convertMkvToWmv);
};

/**
 * 3. AVI to WMV controller
 */
export const aviToWmvController = async (req, res) => {
  await handleWmvConversion(req, res, 'AVI', convertAviToWmv);
};

/**
 * 4. WEBM to WMV controller
 */
export const webmToWmvController = async (req, res) => {
  await handleWmvConversion(req, res, 'WEBM', convertWebmToWmv);
};

/**
 * 5. MOV to WMV controller
 */
export const movToWmvController = async (req, res) => {
  await handleWmvConversion(req, res, 'MOV', convertMovToWmv);
};

/**
 * 6. MPEG to WMV controller
 */
export const mpegToWmvController = async (req, res) => {
  await handleWmvConversion(req, res, 'MPEG', convertMpegToWmv);
};

/**
 * 7. FLV to WMV controller
 */
export const flvToWmvController = async (req, res) => {
  await handleWmvConversion(req, res, 'FLV', convertFlvToWmv);
};

/**
 * 8. 3GP to WMV controller
 */
export const threeGpToWmvController = async (req, res) => {
  await handleWmvConversion(req, res, '3GP', convert3gpToWmv);
};

/**
 * 9. 3G2 to WMV controller
 */
export const threeG2ToWmvController = async (req, res) => {
  await handleWmvConversion(req, res, '3G2', convert3g2ToWmv);
};

export default {
  mp4ToWmvController,
  mkvToWmvController,
  aviToWmvController,
  webmToWmvController,
  movToWmvController,
  mpegToWmvController,
  flvToWmvController,
  threeGpToWmvController,
  threeG2ToWmvController
};
