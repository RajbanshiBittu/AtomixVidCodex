import {
  convertMp4ToAvi,
  convertMkvToAvi,
  convertWmvToAvi,
  convertMovToAvi,
  convertMpegToAvi,
  convertWebmToAvi,
  convertFlvToAvi,
  convert3gpToAvi,
  convert3g2ToAvi,
  cleanupFile
} from '../services/toAvi.services.js';
import logger from '../utils/logger.js';

/**
 * Base controller for handling AVI conversion requests
 */
const handleAviConversion = async (req, res, conversionFunction, formatName) => {
  let uploadedFilePath = null;

  try {
    // Validate file upload
    if (!req.file) {
      logger.warn(`${formatName} to AVI: No file uploaded`);
      return res.status(400).json({
        success: false,
        error: 'No video file provided'
      });
    }

    uploadedFilePath = req.file.path;
    logger.info(`${formatName} to AVI conversion request: ${req.file.originalname}`);

    // Get conversion options from query parameters
    const options = {
      quality: req.query.quality || 'medium',
      preserveMetadata: req.query.preserveMetadata !== 'false',
      customBitrate: req.query.bitrate || null
    };

    // Perform conversion
    const result = await conversionFunction(uploadedFilePath, options);

    // Cleanup uploaded file
    await cleanupFile(uploadedFilePath);

    // Send success response
    res.status(200).json({
      success: true,
      message: `Successfully converted ${formatName} to AVI`,
      data: {
        outputFilename: result.outputFilename,
        outputPath: result.outputPath,
        inputFilename: result.inputFilename,
        outputSize: result.outputSize,
        quality: result.quality,
        reductionPercentage: result.reductionPercentage,
        downloadUrl: `/api/v1/download/${result.outputFilename}`
      }
    });

  } catch (error) {
    logger.error(`${formatName} to AVI conversion error: ${error.message}`, {
      stack: error.stack,
      file: req.file?.originalname,
      path: uploadedFilePath,
      ip: req.ip
    });

    // Cleanup uploaded file on error
    if (uploadedFilePath) {
      await cleanupFile(uploadedFilePath).catch(err => 
        logger.error(`Failed to cleanup file on error: ${err.message}`)
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
 * 1. MP4 to AVI Controller
 */
export const handleMp4ToAvi = async (req, res) => {
  await handleAviConversion(req, res, convertMp4ToAvi, 'MP4');
};

/**
 * 2. MKV to AVI Controller
 */
export const handleMkvToAvi = async (req, res) => {
  await handleAviConversion(req, res, convertMkvToAvi, 'MKV');
};

/**
 * 3. WMV to AVI Controller
 */
export const handleWmvToAvi = async (req, res) => {
  await handleAviConversion(req, res, convertWmvToAvi, 'WMV');
};

/**
 * 4. MOV to AVI Controller
 */
export const handleMovToAvi = async (req, res) => {
  await handleAviConversion(req, res, convertMovToAvi, 'MOV');
};

/**
 * 5. MPEG to AVI Controller
 */
export const handleMpegToAvi = async (req, res) => {
  await handleAviConversion(req, res, convertMpegToAvi, 'MPEG');
};

/**
 * 6. WEBM to AVI Controller
 */
export const handleWebmToAvi = async (req, res) => {
  await handleAviConversion(req, res, convertWebmToAvi, 'WEBM');
};

/**
 * 7. FLV to AVI Controller
 */
export const handleFlvToAvi = async (req, res) => {
  await handleAviConversion(req, res, convertFlvToAvi, 'FLV');
};

/**
 * 8. 3GP to AVI Controller
 */
export const handle3gpToAvi = async (req, res) => {
  await handleAviConversion(req, res, convert3gpToAvi, '3GP');
};

/**
 * 9. 3G2 to AVI Controller
 */
export const handle3g2ToAvi = async (req, res) => {
  await handleAviConversion(req, res, convert3g2ToAvi, '3G2');
};

/**
 * Health check endpoint for AVI conversion service
 */
export const aviHealthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    service: 'AVI Conversion Service',
    status: 'operational',
    availableConversions: [
      'MP4 to AVI',
      'MKV to AVI',
      'WMV to AVI',
      'MOV to AVI',
      'MPEG to AVI',
      'WEBM to AVI',
      'FLV to AVI',
      '3GP to AVI',
      '3G2 to AVI'
    ],
    supportedQualities: ['high', 'medium', 'low'],
    timestamp: new Date().toISOString()
  });
};

export default {
  handleMp4ToAvi,
  handleMkvToAvi,
  handleWmvToAvi,
  handleMovToAvi,
  handleMpegToAvi,
  handleWebmToAvi,
  handleFlvToAvi,
  handle3gpToAvi,
  handle3g2ToAvi,
  aviHealthCheck
};
