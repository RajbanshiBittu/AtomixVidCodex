import path from 'path';
import {
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
  cleanupFile
} from '../services/toMkv.services.js';
import { getFormatByExtension } from '../config/ffmpeg.js';
import logger from '../utils/logger.js';

/**
 * Base MKV conversion controller logic
 */
const handleMkvConversion = async (req, res, expectedFormat, conversionFunction) => {
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

    // Get conversion options from query parameters
    const options = {
      quality: req.query.quality || 'medium',
      preserveMetadata: req.query.preserveMetadata !== 'false',
      customBitrate: req.query.customBitrate || null
    };

    logger.info(`Converting ${expectedFormat} to MKV with options:`, options);

    // Perform conversion
    const result = await conversionFunction(inputPath, options);

    // Clean up input file
    await cleanupFile(inputPath);

    // Send success response
    res.status(200).json({
      success: true,
      message: `${expectedFormat} converted to MKV successfully`,
      data: {
        inputFormat: expectedFormat,
        inputFilename: uploadedFile.originalname,
        outputFilename: result.outputFilename,
        outputPath: path.join('..', 'outputs', result.outputFilename),
        outputSize: result.outputSize,
        quality: result.quality,
        reductionPercentage: result.reductionPercentage,
        conversionPath: 'Direct'
      }
    });

  } catch (error) {
    logger.error(`MKV conversion error: ${error.message}`, {
      file: uploadedFile?.originalname,
      error: error.stack,
      path: req.path,
      ip: req.ip
    });

    // Clean up files on error
    if (uploadedFile?.path) {
      await cleanupFile(uploadedFile.path);
    }

    res.status(500).json({
      success: false,
      error: 'Conversion failed',
      message: 'An error occurred during video conversion. Please try again later.'
    });
  }
};

/**
 * 1. MP4 to MKV controller
 */
export const mp4ToMkvController = async (req, res) => {
  await handleMkvConversion(req, res, 'MP4', convertMp4ToMkv);
};

/**
 * 2. MKV to MKV controller (re-encode / passthrough)
 */
export const mkvToMkvController = async (req, res) => {
  await handleMkvConversion(req, res, 'MKV', convertMkvToMkv);
};

/**
 * 3. AVI to MKV controller
 */
export const aviToMkvController = async (req, res) => {
  await handleMkvConversion(req, res, 'AVI', convertAviToMkv);
};

/**
 * 4. WEBM to MKV controller
 */
export const webmToMkvController = async (req, res) => {
  await handleMkvConversion(req, res, 'WEBM', convertWebmToMkv);
};

/**
 * 5. MOV to MKV controller
 */
export const movToMkvController = async (req, res) => {
  await handleMkvConversion(req, res, 'MOV', convertMovToMkv);
};

/**
 * 6. WMV to MKV controller
 */
export const wmvToMkvController = async (req, res) => {
  await handleMkvConversion(req, res, 'WMV', convertWmvToMkv);
};

/**
 * 7. MPEG to MKV controller
 */
export const mpegToMkvController = async (req, res) => {
  await handleMkvConversion(req, res, 'MPEG', convertMpegToMkv);
};

/**
 * 8. FLV to MKV controller
 */
export const flvToMkvController = async (req, res) => {
  await handleMkvConversion(req, res, 'FLV', convertFlvToMkv);
};

/**
 * 9. 3GP to MKV controller
 */
export const threeGpToMkvController = async (req, res) => {
  await handleMkvConversion(req, res, '3GP', convert3gpToMkv);
};

/**
 * 10. 3G2 to MKV controller
 */
export const threeG2ToMkvController = async (req, res) => {
  await handleMkvConversion(req, res, '3G2', convert3g2ToMkv);
};

export default {
  mp4ToMkvController,
  mkvToMkvController,
  aviToMkvController,
  webmToMkvController,
  movToMkvController,
  wmvToMkvController,
  mpegToMkvController,
  flvToMkvController,
  threeGpToMkvController,
  threeG2ToMkvController
};
