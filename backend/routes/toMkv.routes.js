import express from 'express';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';
import { validateMkvConversionParams } from '../middlewares/validation.middleware.js';
import { validateFileContent, scanForVirus } from '../middlewares/fileValidation.middleware.js';
import {
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
} from '../controllers/toMkv.controllers.js';

const router = express.Router();

/**
 * @route   POST /api/v1/convert/mp4-to-mkv
 * @desc    Convert MP4 video to MKV format
 * @access  Public
 */
router.post(
  '/mp4-to-mkv',
  uploadMiddleware.single('video'),
  validateMkvConversionParams,
  mp4ToMkvController
);

/**
 * @route   POST /api/v1/convert/avi-to-mkv
 * @desc    Convert AVI video to MKV format
 * @access  Public
 */
router.post(
  '/avi-to-mkv',
  uploadMiddleware.single('video'),
  validateMkvConversionParams,
  aviToMkvController
);

/**
 * @route   POST /api/v1/convert/webm-to-mkv
 * @desc    Convert WEBM video to MKV format
 * @access  Public
 */
router.post(
  '/webm-to-mkv',
  uploadMiddleware.single('video'),
  validateMkvConversionParams,
  webmToMkvController
);

/**
 * @route   POST /api/v1/convert/mov-to-mkv
 * @desc    Convert MOV video to MKV format
 * @access  Public
 */
router.post(
  '/mov-to-mkv',
  uploadMiddleware.single('video'),
  validateMkvConversionParams,
  movToMkvController
);

/**
 * @route   POST /api/v1/convert/wmv-to-mkv
 * @desc    Convert WMV video to MKV format
 * @access  Public
 */
router.post(
  '/wmv-to-mkv',
  uploadMiddleware.single('video'),
  validateMkvConversionParams,
  wmvToMkvController
);

/**
 * @route   POST /api/v1/convert/mpeg-to-mkv
 * @desc    Convert MPEG video to MKV format
 * @access  Public
 */
router.post(
  '/mpeg-to-mkv',
  uploadMiddleware.single('video'),
  validateMkvConversionParams,
  mpegToMkvController
);

/**
 * @route   POST /api/v1/convert/flv-to-mkv
 * @desc    Convert FLV video to MKV format
 * @access  Public
 */
router.post(
  '/flv-to-mkv',
  uploadMiddleware.single('video'),
  validateMkvConversionParams,
  flvToMkvController
);

/**
 * @route   POST /api/v1/convert/3gp-to-mkv
 * @desc    Convert 3GP video to MKV format
 * @access  Public
 */
router.post(
  '/3gp-to-mkv',
  uploadMiddleware.single('video'),
  validateMkvConversionParams,
  threeGpToMkvController
);

/**
 * @route   POST /api/v1/convert/3g2-to-mkv
 * @desc    Convert 3G2 video to MKV format
 * @access  Public
 */
router.post(
  '/3g2-to-mkv',
  uploadMiddleware.single('video'),
  validateMkvConversionParams,
  threeG2ToMkvController
);

/**
 * @route   GET /api/v1/convert/mkv/health
 * @desc    Health check endpoint for MKV conversion service
 * @access  Public
 */
router.get('/mkv/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'MKV Conversion Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    supportedConversions: [
      'MP4 to MKV',
      'MKV to MKV (re-encode)',
      'AVI to MKV',
      'WEBM to MKV',
      'MOV to MKV',
      'WMV to MKV',
      'MPEG to MKV',
      'FLV to MKV',
      '3GP to MKV',
      '3G2 to MKV'
    ]
  });
});

export { router as toMkvRoutes };
