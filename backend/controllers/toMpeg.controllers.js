import path from 'path';
import {
  convertMp4ToMpeg,
  convertMkvToMpeg,
  convertAviToMpeg,
  convertWmvToMpeg,
  convertMovToMpeg,
  convertWebmToMpeg,
  convertFlvToMpeg,
  convert3gpToMpeg,
  convert3g2ToMpeg,
  cleanupFile
} from '../services/toMpeg.services.js';
import { getFormatByExtension } from '../config/ffmpeg.js';
import logger from '../utils/logger.js';

/**
 * Base conversion controller logic for MPEG conversions
 */
const handleMpegConversion = async (req, res, expectedFormat, conversionFunction) => {
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

    logger.info(`Processing ${formatInfo.name} to MPEG conversion`);
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
      message: `${formatInfo.name} converted to MPEG successfully`,
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
    logger.error(`MPEG conversion failed: ${error.message}`, {
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
 * 1. MP4 to MPEG controller
 */
export const mp4ToMpegController = async (req, res) => {
  await handleMpegConversion(req, res, 'MP4', convertMp4ToMpeg);
};

/**
 * 2. MKV to MPEG controller
 */
export const mkvToMpegController = async (req, res) => {
  await handleMpegConversion(req, res, 'MKV', convertMkvToMpeg);
};

/**
 * 3. AVI to MPEG controller
 */
export const aviToMpegController = async (req, res) => {
  await handleMpegConversion(req, res, 'AVI', convertAviToMpeg);
};

/**
 * 4. WMV to MPEG controller
 */
export const wmvToMpegController = async (req, res) => {
  await handleMpegConversion(req, res, 'WMV', convertWmvToMpeg);
};

/**
 * 5. MOV to MPEG controller
 */
export const movToMpegController = async (req, res) => {
  await handleMpegConversion(req, res, 'MOV', convertMovToMpeg);
};

/**
 * 6. WEBM to MPEG controller
 */
export const webmToMpegController = async (req, res) => {
  await handleMpegConversion(req, res, 'WEBM', convertWebmToMpeg);
};

/**
 * 7. FLV to MPEG controller
 */
export const flvToMpegController = async (req, res) => {
  await handleMpegConversion(req, res, 'FLV', convertFlvToMpeg);
};

/**
 * 8. 3GP to MPEG controller
 */
export const threeGpToMpegController = async (req, res) => {
  await handleMpegConversion(req, res, '3GP', convert3gpToMpeg);
};

/**
 * 9. 3G2 to MPEG controller
 */
export const threeG2ToMpegController = async (req, res) => {
  await handleMpegConversion(req, res, '3G2', convert3g2ToMpeg);
};

export default {
  mp4ToMpegController,
  mkvToMpegController,
  aviToMpegController,
  wmvToMpegController,
  movToMpegController,
  webmToMpegController,
  flvToMpegController,
  threeGpToMpegController,
  threeG2ToMpegController
};
