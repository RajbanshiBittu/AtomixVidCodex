import express from 'express';
import {
  mp4ToFlvController,
  webmToFlvController,
  aviToFlvController,
  movToFlvController,
  mkvToFlvController,
  wmvToFlvController,
  mpegToFlvController,
  threeGpToFlvController,
  threeG2ToFlvController
} from '../controllers/toFlv.controllers.js';

import {
  uploadMiddleware,
  handleUploadError,
  validateUpload
} from '../middlewares/upload.middleware.js';

import { validateFlvConversionParams } from '../middlewares/validation.middleware.js';
import { validateFileContent, scanForVirus } from '../middlewares/fileValidation.middleware.js';

const router = express.Router();

/**
 * MP4 to FLV conversion endpoint
 */
router.post(
  '/mp4-to-flv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateFlvConversionParams,
  mp4ToFlvController
);

/**
 * WEBM to FLV conversion endpoint
 */
router.post(
  '/webm-to-flv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateFlvConversionParams,
  webmToFlvController
);

/**
 * AVI to FLV conversion endpoint
 */
router.post(
  '/avi-to-flv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateFlvConversionParams,
  aviToFlvController
);

/**
 * MOV to FLV conversion endpoint
 */
router.post(
  '/mov-to-flv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateFlvConversionParams,
  movToFlvController
);

/**
 * MKV to FLV conversion endpoint
 */
router.post(
  '/mkv-to-flv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateFlvConversionParams,
  mkvToFlvController
);

/**
 * WMV to FLV conversion endpoint
 */
router.post(
  '/wmv-to-flv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateFlvConversionParams,
  wmvToFlvController
);

/**
 * MPEG to FLV conversion endpoint
 */
router.post(
  '/mpeg-to-flv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateFlvConversionParams,
  mpegToFlvController
);

/**
 * 3GP to FLV conversion endpoint
 */
router.post(
  '/3gp-to-flv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateFlvConversionParams,
  threeGpToFlvController
);

/**
 * 3G2 to FLV conversion endpoint
 */
router.post(
  '/3g2-to-flv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateFlvConversionParams,
  threeG2ToFlvController
);

export { router as toFlvRoutes };
