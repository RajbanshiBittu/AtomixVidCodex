import path from 'path';
import { convertToMp4, cleanupFile } from '../services/toMp4.services.js';
import { getFormatByExtension } from '../config/ffmpeg.js';
import logger from '../utils/logger.js';

/**
 * Base conversion controller logic
 */
const handleConversion = async (req, res, expectedFormat) => {
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

    logger.info(`Processing ${formatInfo.name} to MP4 conversion`);
    logger.info(`Original filename: ${uploadedFile.originalname}`);
    logger.info(`File size: ${uploadedFile.size} bytes`);

    // Get conversion options from validated query
    const conversionOptions = {
      quality: req.validatedQuery?.quality || 'medium',
      preserveMetadata: req.validatedQuery?.preserveMetadata !== false,
      customBitrate: req.validatedQuery?.customBitrate || null
    };

    // Perform conversion
    const result = await convertToMp4(inputPath, conversionOptions);

    // Clean up uploaded file
    await cleanupFile(inputPath);

    // Return success response
    res.status(200).json({
      success: true,
      message: `${formatInfo.name} converted to MP4 successfully`,
      data: {
        inputFormat: formatInfo.name,
        inputFilename: uploadedFile.originalname,
        outputFilename: result.outputFilename,
        outputPath: path.join('..', 'outputs', result.outputFilename),
        outputSize: result.outputSize,
        quality: result.quality,
        reductionPercentage: result.reductionPercentage
      }
    });

  } catch (error) {
    logger.error(`Conversion failed: ${error.message}`, {
      file: uploadedFile?.originalname,
      error: error.stack,
      path: req.path,
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
 * AVI to MP4 controller
 */
export const aviToMp4Controller = async (req, res) => {
  await handleConversion(req, res, 'AVI');
};

/**
 * MOV to MP4 controller
 */
export const movToMp4Controller = async (req, res) => {
  await handleConversion(req, res, 'MOV');
};

/**
 * MKV to MP4 controller
 */
export const mkvToMp4Controller = async (req, res) => {
  await handleConversion(req, res, 'MKV');
};

/**
 * WMV to MP4 controller
 */
export const wmvToMp4Controller = async (req, res) => {
  await handleConversion(req, res, 'WMV');
};

/**
 * FLV to MP4 controller
 */
export const flvToMp4Controller = async (req, res) => {
  await handleConversion(req, res, 'FLV');
};

/**
 * MPEG to MP4 controller
 */
export const mpegToMp4Controller = async (req, res) => {
  await handleConversion(req, res, 'MPEG');
};

/**
 * 3GP to MP4 controller
 */
export const threeGpToMp4Controller = async (req, res) => {
  await handleConversion(req, res, '3GP');
};

/**
 * 3G2 to MP4 controller
 */
export const threeG2ToMp4Controller = async (req, res) => {
  await handleConversion(req, res, '3G2');
};

/**
 * WEBM to MP4 controller
 */
export const webmToMp4Controller = async (req, res) => {
  await handleConversion(req, res, 'WEBM');
};

export default {
  aviToMp4Controller,
  movToMp4Controller,
  mkvToMp4Controller,
  wmvToMp4Controller,
  flvToMp4Controller,
  mpegToMp4Controller,
  threeGpToMp4Controller,
  threeG2ToMp4Controller,
  webmToMp4Controller
};