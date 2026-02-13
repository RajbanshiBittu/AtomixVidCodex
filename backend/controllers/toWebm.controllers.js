import path from 'path';
import { convertToWebm, convertMpegToWebm, convert3gpToWebm, convert3g2ToWebm, cleanupFile } from '../services/toWebm.services.js';
import { getFormatByExtension } from '../config/ffmpeg.js';
import logger from '../utils/logger.js';

/**
 * Base WebM conversion controller logic
 */
const handleWebmConversion = async (req, res, expectedFormat) => {
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

    logger.info(`Processing ${formatInfo.name} to WebM conversion`);
    logger.info(`Original filename: ${uploadedFile.originalname}`);
    logger.info(`File size: ${uploadedFile.size} bytes`);

    // Get conversion options from validated query
    const conversionOptions = {
      quality: req.validatedQuery?.quality || 'medium',
      customBitrate: req.validatedQuery?.customBitrate || null
    };

    // Perform conversion
    const result = await convertToWebm(inputPath, conversionOptions);

    // Clean up uploaded file
    await cleanupFile(inputPath);

    // Return success response
    res.status(200).json({
      success: true,
      message: `${formatInfo.name} converted to WebM successfully`,
      data: {
        inputFormat: formatInfo.name,
        inputFilename: uploadedFile.originalname,
        outputFilename: result.outputFilename,
        outputPath: path.join('..', 'outputs', result.outputFilename),
        outputSize: result.outputSize,
        quality: result.quality
      }
    });

  } catch (error) {
    logger.error(`WebM conversion failed: ${error.message}`, {
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
 * MP4 to WebM controller
 */
export const mp4ToWebmController = async (req, res) => {
  await handleWebmConversion(req, res, 'MP4');
};

/**
 * MOV to WebM controller
 */
export const movToWebmController = async (req, res) => {
  await handleWebmConversion(req, res, 'MOV');
};

/**
 * MKV to WebM controller
 */
export const mkvToWebmController = async (req, res) => {
  await handleWebmConversion(req, res, 'MKV');
};

/**
 * AVI to WebM controller
 */
export const aviToWebmController = async (req, res) => {
  await handleWebmConversion(req, res, 'AVI');
};

/**
 * WMV to WebM controller
 */
export const wmvToWebmController = async (req, res) => {
  await handleWebmConversion(req, res, 'WMV');
};

/**
 * FLV to WebM controller
 */
export const flvToWebmController = async (req, res) => {
  await handleWebmConversion(req, res, 'FLV');
};

/**
 * MPEG to WebM controller (via MP4 intermediate)
 */
export const mpegToWebmController = async (req, res) => {
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

    // Validate format is MPEG
    if (formatInfo?.name !== 'MPEG') {
      await cleanupFile(inputPath);
      return res.status(400).json({
        success: false,
        error: 'Invalid format',
        message: `Expected MPEG format, but received ${formatInfo?.name || 'unknown'} format`
      });
    }

    logger.info(`Processing ${formatInfo.name} to WebM conversion (via MP4 intermediate)`);
    logger.info(`Original filename: ${uploadedFile.originalname}`);
    logger.info(`File size: ${uploadedFile.size} bytes`);

    // Get conversion options from validated query
    const conversionOptions = {
      quality: req.validatedQuery?.quality || 'medium',
      customBitrate: req.validatedQuery?.customBitrate || null
    };

    // Perform MPEG -> MP4 -> WebM conversion
    const result = await convertMpegToWebm(inputPath, conversionOptions);

    // Clean up uploaded file
    await cleanupFile(inputPath);

    // Return success response
    res.status(200).json({
      success: true,
      message: `${formatInfo.name} converted to WebM successfully (via MP4 intermediate)`,
      data: {
        inputFormat: formatInfo.name,
        inputFilename: uploadedFile.originalname,
        outputFilename: result.outputFilename,
        outputPath: path.join('..', 'outputs', result.outputFilename),
        outputSize: result.outputSize,
        quality: result.quality,
        conversionMethod: result.conversionMethod
      }
    });

  } catch (error) {
    logger.error(`MPEG to WebM conversion failed: ${error.message}`, {
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
 * 3GP to WebM controller (via MP4 intermediate)
 */
export const threeGpToWebmController = async (req, res) => {
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

    // Validate format is 3GP
    if (formatInfo?.name !== '3GP') {
      await cleanupFile(inputPath);
      return res.status(400).json({
        success: false,
        error: 'Invalid format',
        message: `Expected 3GP format, but received ${formatInfo?.name || 'unknown'} format`
      });
    }

    logger.info(`Processing ${formatInfo.name} to WebM conversion (via MP4 intermediate)`);
    logger.info(`Original filename: ${uploadedFile.originalname}`);
    logger.info(`File size: ${uploadedFile.size} bytes`);

    // Get conversion options from validated query
    const conversionOptions = {
      quality: req.validatedQuery?.quality || 'medium',
      customBitrate: req.validatedQuery?.customBitrate || null
    };

    // Perform 3GP -> MP4 -> WebM conversion
    const result = await convert3gpToWebm(inputPath, conversionOptions);

    // Clean up uploaded file
    await cleanupFile(inputPath);

    // Return success response
    res.status(200).json({
      success: true,
      message: `${formatInfo.name} converted to WebM successfully (via MP4 intermediate)`,
      data: {
        inputFormat: formatInfo.name,
        inputFilename: uploadedFile.originalname,
        outputFilename: result.outputFilename,
        outputPath: path.join('..', 'outputs', result.outputFilename),
        outputSize: result.outputSize,
        quality: result.quality,
        conversionMethod: result.conversionMethod
      }
    });

  } catch (error) {
    logger.error(`3GP to WebM conversion failed: ${error.message}`, {
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
 * 3G2 to WebM controller (via MP4 intermediate)
 */
export const threeG2ToWebmController = async (req, res) => {
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

    // Validate format is 3G2
    if (formatInfo?.name !== '3G2') {
      await cleanupFile(inputPath);
      return res.status(400).json({
        success: false,
        error: 'Invalid format',
        message: `Expected 3G2 format, but received ${formatInfo?.name || 'unknown'} format`
      });
    }

    logger.info(`Processing ${formatInfo.name} to WebM conversion (via MP4 intermediate)`);
    logger.info(`Original filename: ${uploadedFile.originalname}`);
    logger.info(`File size: ${uploadedFile.size} bytes`);

    // Get conversion options from validated query
    const conversionOptions = {
      quality: req.validatedQuery?.quality || 'medium',
      customBitrate: req.validatedQuery?.customBitrate || null
    };

    // Perform 3G2 -> MP4 -> WebM conversion
    const result = await convert3g2ToWebm(inputPath, conversionOptions);

    // Clean up uploaded file
    await cleanupFile(inputPath);

    // Return success response
    res.status(200).json({
      success: true,
      message: `${formatInfo.name} converted to WebM successfully (via MP4 intermediate)`,
      data: {
        inputFormat: formatInfo.name,
        inputFilename: uploadedFile.originalname,
        outputFilename: result.outputFilename,
        outputPath: path.join('..', 'outputs', result.outputFilename),
        outputSize: result.outputSize,
        quality: result.quality,
        conversionMethod: result.conversionMethod
      }
    });

  } catch (error) {
    logger.error(`3G2 to WebM conversion failed: ${error.message}`, {
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

export default {
  mp4ToWebmController,
  movToWebmController,
  mkvToWebmController,
  aviToWebmController,
  wmvToWebmController,
  flvToWebmController,
  mpegToWebmController,
  threeGpToWebmController,
  threeG2ToWebmController
};
