import express from 'express';
import {
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
} from '../controllers/toAvi.controllers.js';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';
import { validateAviConversionParams } from '../middlewares/validation.middleware.js';
import { validateFileContent, scanForVirus } from '../middlewares/fileValidation.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/v1/convert/avi/health
 * @desc    Health check for AVI conversion service
 * @access  Public
 */
router.get('/avi/health', aviHealthCheck);

/**
 * @route   POST /api/v1/convert/mp4-to-avi
 * @desc    Convert MP4 video to AVI format
 * @access  Public
 * @body    video - Video file (multipart/form-data)
 * @query   quality - Conversion quality: high, medium, low (default: medium)
 * @query   preserveMetadata - Preserve video metadata (default: true)
 * @query   bitrate - Custom video bitrate (optional)
 */
router.post(
  '/mp4-to-avi',
  uploadMiddleware.single('video'),
  validateAviConversionParams,
  handleMp4ToAvi
);

/**
 * @route   POST /api/v1/convert/mkv-to-avi
 * @desc    Convert MKV video to AVI format
 * @access  Public
 * @body    video - Video file (multipart/form-data)
 * @query   quality - Conversion quality: high, medium, low (default: medium)
 * @query   preserveMetadata - Preserve video metadata (default: true)
 * @query   bitrate - Custom video bitrate (optional)
 */
router.post(
  '/mkv-to-avi',
  uploadMiddleware.single('video'),
  validateAviConversionParams,
  handleMkvToAvi
);

/**
 * @route   POST /api/v1/convert/wmv-to-avi
 * @desc    Convert WMV video to AVI format
 * @access  Public
 * @body    video - Video file (multipart/form-data)
 * @query   quality - Conversion quality: high, medium, low (default: medium)
 * @query   preserveMetadata - Preserve video metadata (default: true)
 * @query   bitrate - Custom video bitrate (optional)
 */
router.post(
  '/wmv-to-avi',
  uploadMiddleware.single('video'),
  validateAviConversionParams,
  handleWmvToAvi
);

/**
 * @route   POST /api/v1/convert/mov-to-avi
 * @desc    Convert MOV video to AVI format
 * @access  Public
 * @body    video - Video file (multipart/form-data)
 * @query   quality - Conversion quality: high, medium, low (default: medium)
 * @query   preserveMetadata - Preserve video metadata (default: true)
 * @query   bitrate - Custom video bitrate (optional)
 */
router.post(
  '/mov-to-avi',
  uploadMiddleware.single('video'),
  validateAviConversionParams,
  handleMovToAvi
);

/**
 * @route   POST /api/v1/convert/mpeg-to-avi
 * @desc    Convert MPEG video to AVI format
 * @access  Public
 * @body    video - Video file (multipart/form-data)
 * @query   quality - Conversion quality: high, medium, low (default: medium)
 * @query   preserveMetadata - Preserve video metadata (default: true)
 * @query   bitrate - Custom video bitrate (optional)
 */
router.post(
  '/mpeg-to-avi',
  uploadMiddleware.single('video'),
  validateAviConversionParams,
  handleMpegToAvi
);

/**
 * @route   POST /api/v1/convert/webm-to-avi
 * @desc    Convert WEBM video to AVI format (via MP4 intermediate)
 * @access  Public
 * @body    video - Video file (multipart/form-data)
 * @query   quality - Conversion quality: high, medium, low (default: medium)
 * @query   preserveMetadata - Preserve video metadata (default: true)
 * @query   bitrate - Custom video bitrate (optional)
 */
router.post(
  '/webm-to-avi',
  uploadMiddleware.single('video'),
  validateAviConversionParams,
  handleWebmToAvi
);

/**
 * @route   POST /api/v1/convert/flv-to-avi
 * @desc    Convert FLV video to AVI format
 * @access  Public
 * @body    video - Video file (multipart/form-data)
 * @query   quality - Conversion quality: high, medium, low (default: medium)
 * @query   preserveMetadata - Preserve video metadata (default: true)
 * @query   bitrate - Custom video bitrate (optional)
 */
router.post(
  '/flv-to-avi',
  uploadMiddleware.single('video'),
  validateAviConversionParams,
  handleFlvToAvi
);

/**
 * @route   POST /api/v1/convert/3gp-to-avi
 * @desc    Convert 3GP video to AVI format (via MP4 intermediate)
 * @access  Public
 * @body    video - Video file (multipart/form-data)
 * @query   quality - Conversion quality: high, medium, low (default: medium)
 * @query   preserveMetadata - Preserve video metadata (default: true)
 * @query   bitrate - Custom video bitrate (optional)
 */
router.post(
  '/3gp-to-avi',
  uploadMiddleware.single('video'),
  validateAviConversionParams,
  handle3gpToAvi
);

/**
 * @route   POST /api/v1/convert/3g2-to-avi
 * @desc    Convert 3G2 video to AVI format (via MP4 intermediate)
 * @access  Public
 * @body    video - Video file (multipart/form-data)
 * @query   quality - Conversion quality: high, medium, low (default: medium)
 * @query   preserveMetadata - Preserve video metadata (default: true)
 * @query   bitrate - Custom video bitrate (optional)
 */
router.post(
  '/3g2-to-avi',
  uploadMiddleware.single('video'),
  validateAviConversionParams,
  handle3g2ToAvi
);

export default router;
