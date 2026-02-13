import path from 'path';
import { convertTo3g2, cleanupFile } from '../services/to3g2.services.js';
import { getFormatByExtension } from '../config/ffmpeg.js';
import logger from '../utils/logger.js';

/**
 * Base conversion controller logic for 3G2
 */
const handle3g2Conversion = async (req, res, expectedFormat) => {
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

    logger.info(`Processing ${formatInfo.name} to 3G2 conversion`);
    logger.info(`Original filename: ${uploadedFile.originalname}`);
    logger.info(`File size: ${uploadedFile.size} bytes`);

    // Get conversion options from validated query
    const conversionOptions = {
      quality: req.validatedQuery?.quality || 'medium',
      preserveMetadata: req.validatedQuery?.preserveMetadata !== false
    };

    // Perform conversion
    const result = await convertTo3g2(inputPath, conversionOptions);

    // Clean up uploaded file
    await cleanupFile(inputPath);

    // Return success response
    res.status(200).json({
      success: true,
      message: `${formatInfo.name} converted to 3G2 successfully`,
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
    logger.error(`3G2 conversion failed: ${error.message}`, {
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
 * MP4 to 3G2 controller
 */
export const mp4To3g2Controller = async (req, res) => {
  await handle3g2Conversion(req, res, 'MP4');
};

/**
 * WEBM to 3G2 controller
 */
export const webmTo3g2Controller = async (req, res) => {
  await handle3g2Conversion(req, res, 'WEBM');
};

/**
 * AVI to 3G2 controller
 */
export const aviTo3g2Controller = async (req, res) => {
  await handle3g2Conversion(req, res, 'AVI');
};

/**
 * MOV to 3G2 controller
 */
export const movTo3g2Controller = async (req, res) => {
  await handle3g2Conversion(req, res, 'MOV');
};

/**
 * MKV to 3G2 controller
 */
export const mkvTo3g2Controller = async (req, res) => {
  await handle3g2Conversion(req, res, 'MKV');
};

/**
 * WMV to 3G2 controller
 */
export const wmvTo3g2Controller = async (req, res) => {
  await handle3g2Conversion(req, res, 'WMV');
};

/**
 * FLV to 3G2 controller
 */
export const flvTo3g2Controller = async (req, res) => {
  await handle3g2Conversion(req, res, 'FLV');
};

/**
 * MPEG to 3G2 controller
 */
export const mpegTo3g2Controller = async (req, res) => {
  await handle3g2Conversion(req, res, 'MPEG');
};

/**
 * 3GP to 3G2 controller
 */
export const threeGpTo3g2Controller = async (req, res) => {
  await handle3g2Conversion(req, res, '3GP');
};
