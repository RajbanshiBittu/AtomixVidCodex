import express from 'express';
import {
  aviToMp4Controller,
  movToMp4Controller,
  mkvToMp4Controller,
  wmvToMp4Controller,
  flvToMp4Controller,
  mpegToMp4Controller,
  threeGpToMp4Controller,
  threeG2ToMp4Controller,
  webmToMp4Controller
} from '../controllers/toMp4.controllers.js';

import {
  uploadMiddleware,
  handleUploadError,
  validateUpload
} from '../middlewares/upload.middleware.js';

import { validateConversionParams } from '../middlewares/validation.middleware.js';
import { validateFileContent, scanForVirus } from '../middlewares/fileValidation.middleware.js';

const router = express.Router();

/**
 * AVI to MP4 conversion endpoint
 */
router.post(
  '/avi-to-mp4',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateFileContent,
  scanForVirus,
  validateConversionParams,
  aviToMp4Controller
);

/**
 * MOV to MP4 conversion endpoint
 */
router.post(
  '/mov-to-mp4',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  movToMp4Controller
);

/**
 * MKV to MP4 conversion endpoint
 */
router.post(
  '/mkv-to-mp4',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  mkvToMp4Controller
);

/**
 * WMV to MP4 conversion endpoint
 */
router.post(
  '/wmv-to-mp4',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  wmvToMp4Controller
);

/**
 * FLV to MP4 conversion endpoint
 */
router.post(
  '/flv-to-mp4',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  flvToMp4Controller
);

/**
 * MPEG to MP4 conversion endpoint
 */
router.post(
  '/mpeg-to-mp4',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  mpegToMp4Controller
);

/**
 * 3GP to MP4 conversion endpoint
 */
router.post(
  '/3gp-to-mp4',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  threeGpToMp4Controller
);

/**
 * 3G2 to MP4 conversion endpoint
 */
router.post(
  '/3g2-to-mp4',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  threeG2ToMp4Controller
);

/**
 * WEBM to MP4 conversion endpoint
 */
router.post(
  '/webm-to-mp4',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  webmToMp4Controller
);

export { router as toMp4Routes };