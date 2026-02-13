import express from 'express';
import {
  mp4To3gpController,
  webmTo3gpController,
  aviTo3gpController,
  movTo3gpController,
  mkvTo3gpController,
  wmvTo3gpController,
  flvTo3gpController,
  mpegTo3gpController,
  threeG2To3gpController
} from '../controllers/to3gp.controllers.js';

import {
  uploadMiddleware,
  handleUploadError,
  validateUpload
} from '../middlewares/upload.middleware.js';

import { validate3gpConversionParams } from '../middlewares/validation.middleware.js';
import { validateFileContent, scanForVirus } from '../middlewares/fileValidation.middleware.js';

const router = express.Router();

/**
 * MP4 to 3GP conversion endpoint
 */
router.post(
  '/mp4-to-3gp',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3gpConversionParams,
  mp4To3gpController
);

/**
 * WEBM to 3GP conversion endpoint
 */
router.post(
  '/webm-to-3gp',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3gpConversionParams,
  webmTo3gpController
);

/**
 * AVI to 3GP conversion endpoint
 */
router.post(
  '/avi-to-3gp',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3gpConversionParams,
  aviTo3gpController
);

/**
 * MOV to 3GP conversion endpoint
 */
router.post(
  '/mov-to-3gp',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3gpConversionParams,
  movTo3gpController
);

/**
 * MKV to 3GP conversion endpoint
 */
router.post(
  '/mkv-to-3gp',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3gpConversionParams,
  mkvTo3gpController
);

/**
 * WMV to 3GP conversion endpoint
 */
router.post(
  '/wmv-to-3gp',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3gpConversionParams,
  wmvTo3gpController
);

/**
 * FLV to 3GP conversion endpoint
 */
router.post(
  '/flv-to-3gp',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3gpConversionParams,
  flvTo3gpController
);

/**
 * MPEG to 3GP conversion endpoint
 */
router.post(
  '/mpeg-to-3gp',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3gpConversionParams,
  mpegTo3gpController
);

/**
 * 3G2 to 3GP conversion endpoint
 */
router.post(
  '/3g2-to-3gp',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validate3gpConversionParams,
  threeG2To3gpController
);

export { router as to3gpRoutes };
