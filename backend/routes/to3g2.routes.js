import express from 'express';
import {
  mp4To3g2Controller,
  webmTo3g2Controller,
  aviTo3g2Controller,
  movTo3g2Controller,
  mkvTo3g2Controller,
  wmvTo3g2Controller,
  flvTo3g2Controller,
  mpegTo3g2Controller,
  threeGpTo3g2Controller
} from '../controllers/to3g2.controllers.js';

import {
  uploadMiddleware,
  handleUploadError,
  validateUpload
} from '../middlewares/upload.middleware.js';

import { validate3g2ConversionParams } from '../middlewares/validation.middleware.js';
import { validateFileContent, scanForVirus } from '../middlewares/fileValidation.middleware.js';

const router = express.Router();

/**
 * MP4 to 3G2 conversion endpoint
 */
router.post(
  '/mp4-to-3g2',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3g2ConversionParams,
  mp4To3g2Controller
);

/**
 * WEBM to 3G2 conversion endpoint
 */
router.post(
  '/webm-to-3g2',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3g2ConversionParams,
  webmTo3g2Controller
);

/**
 * AVI to 3G2 conversion endpoint
 */
router.post(
  '/avi-to-3g2',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3g2ConversionParams,
  aviTo3g2Controller
);

/**
 * MOV to 3G2 conversion endpoint
 */
router.post(
  '/mov-to-3g2',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3g2ConversionParams,
  movTo3g2Controller
);

/**
 * MKV to 3G2 conversion endpoint
 */
router.post(
  '/mkv-to-3g2',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3g2ConversionParams,
  mkvTo3g2Controller
);

/**
 * WMV to 3G2 conversion endpoint
 */
router.post(
  '/wmv-to-3g2',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3g2ConversionParams,
  wmvTo3g2Controller
);

/**
 * FLV to 3G2 conversion endpoint
 */
router.post(
  '/flv-to-3g2',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3g2ConversionParams,
  flvTo3g2Controller
);

/**
 * MPEG to 3G2 conversion endpoint
 */
router.post(
  '/mpeg-to-3g2',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3g2ConversionParams,
  mpegTo3g2Controller
);

/**
 * 3GP to 3G2 conversion endpoint
 */
router.post(
  '/3gp-to-3g2',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3g2ConversionParams,
  threeGpTo3g2Controller
);

export { router as to3g2Routes };
