import express from "express";

import {
  mp4ToWebmController,
  movToWebmController,
  mkvToWebmController,
  aviToWebmController,
  wmvToWebmController,
  flvToWebmController,
  mpegToWebmController,
  threeGpToWebmController,
  threeG2ToWebmController
} from "../controllers/toWebm.controllers.js";

import {
  uploadMiddleware,
  handleUploadError,
  validateUpload
} from '../middlewares/upload.middleware.js';

import { validateConversionParams } from '../middlewares/validation.middleware.js';
import { validateFileContent, scanForVirus } from '../middlewares/fileValidation.middleware.js';

const router = express.Router();

/**
 * MP4 to WebM conversion endpoint
 */
router.post(
  "/mp4-to-webm",
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  mp4ToWebmController
);

/**
 * MOV to WebM conversion endpoint
 */
router.post(
  "/mov-to-webm",
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  movToWebmController
);

/**
 * MKV to WebM conversion endpoint
 */
router.post(
  "/mkv-to-webm",
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  mkvToWebmController
);

/**
 * AVI to WebM conversion endpoint
 */
router.post(
  "/avi-to-webm",
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  aviToWebmController
);

/**
 * WMV to WebM conversion endpoint
 */
router.post(
  "/wmv-to-webm",
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  wmvToWebmController
);

/**
 * FLV to WebM conversion endpoint
 */
router.post(
  "/flv-to-webm",
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  flvToWebmController
);

/**
 * MPEG to WebM conversion endpoint (via MP4 intermediate)
 */
router.post(
  "/mpeg-to-webm",
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  mpegToWebmController
);

/**
 * 3GP to WebM conversion endpoint (via MP4 intermediate)
 */
router.post(
  "/3gp-to-webm",
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  threeGpToWebmController
);

/**
 * 3G2 to WebM conversion endpoint (via MP4 intermediate)
 */
router.post(
  "/3g2-to-webm",
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateConversionParams,
  threeG2ToWebmController
);

export { router as toWebmRoutes };