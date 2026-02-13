import path from 'path';
import { convertTo3gp, cleanupFile } from '../services/to3gp.services.js';
import { getFormatByExtension } from '../config/ffmpeg.js';
import logger from '../utils/logger.js';

/**
 * Base conversion controller logic for 3GP
 */
const handle3gpConversion = async (req, res, expectedFormat) => {
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

    logger.info(`Processing ${formatInfo.name} to 3GP conversion`);
    logger.info(`Original filename: ${uploadedFile.originalname}`);
    logger.info(`File size: ${uploadedFile.size} bytes`);

    // Get conversion options from validated query
    const conversionOptions = {
      quality: req.validatedQuery?.quality || 'medium',
      preserveMetadata: req.validatedQuery?.preserveMetadata !== false
    };

    // Perform conversion
    const result = await convertTo3gp(inputPath, conversionOptions);

    // Clean up uploaded file
    await cleanupFile(inputPath);

    // Return success response
    res.status(200).json({
      success: true,
      message: `${formatInfo.name} converted to 3GP successfully`,
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
    logger.error(`3GP conversion failed: ${error.message}`, {
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
 * MP4 to 3GP controller
 */
export const mp4To3gpController = async (req, res) => {
  await handle3gpConversion(req, res, 'MP4');
};

/**
 * WEBM to 3GP controller
 */
export const webmTo3gpController = async (req, res) => {
  await handle3gpConversion(req, res, 'WEBM');
};

/**
 * AVI to 3GP controller
 */
export const aviTo3gpController = async (req, res) => {
  await handle3gpConversion(req, res, 'AVI');
};

/**
 * MOV to 3GP controller
 */
export const movTo3gpController = async (req, res) => {
  await handle3gpConversion(req, res, 'MOV');
};

/**
 * MKV to 3GP controller
 */
export const mkvTo3gpController = async (req, res) => {
  await handle3gpConversion(req, res, 'MKV');
};

/**
 * WMV to 3GP controller
 */
export const wmvTo3gpController = async (req, res) => {
  await handle3gpConversion(req, res, 'WMV');
};

/**
 * FLV to 3GP controller
 */
export const flvTo3gpController = async (req, res) => {
  await handle3gpConversion(req, res, 'FLV');
};

/**
 * MPEG to 3GP controller
 */
export const mpegTo3gpController = async (req, res) => {
  await handle3gpConversion(req, res, 'MPEG');
};

/**
 * 3G2 to 3GP controller
 */
export const threeG2To3gpController = async (req, res) => {
  await handle3gpConversion(req, res, '3G2');
};
