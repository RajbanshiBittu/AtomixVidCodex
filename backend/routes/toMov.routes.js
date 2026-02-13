import express from 'express';
import {
  mp4ToMovController,
  mkvToMovController,
  aviToMovController,
  wmvToMovController,
  mpegToMovController,
  flvToMovController,
  webmToMovController,
  threeGpToMovController,
  threeG2ToMovController
} from '../controllers/toMov.controllers.js';

import {
  uploadMiddleware,
  handleUploadError,
  validateUpload
} from '../middlewares/upload.middleware.js';

import { validateMovConversionParams } from '../middlewares/validation.middleware.js';
import { validateFileContent, scanForVirus } from '../middlewares/fileValidation.middleware.js';

const router = express.Router();

/**
 * 1. MP4 to MOV conversion endpoint
 */
router.post(
  '/mp4-to-mov',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMovConversionParams,
  mp4ToMovController
);

/**
 * 2. MKV to MOV conversion endpoint
 */
router.post(
  '/mkv-to-mov',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMovConversionParams,
  mkvToMovController
);

/**
 * 3. AVI to MOV conversion endpoint
 */
router.post(
  '/avi-to-mov',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMovConversionParams,
  aviToMovController
);

/**
 * 4. WMV to MOV conversion endpoint
 */
router.post(
  '/wmv-to-mov',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMovConversionParams,
  wmvToMovController
);

/**
 * 5. MPEG to MOV conversion endpoint
 */
router.post(
  '/mpeg-to-mov',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMovConversionParams,
  mpegToMovController
);

/**
 * 6. FLV to MOV conversion endpoint (via MP4 intermediate)
 */
router.post(
  '/flv-to-mov',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMovConversionParams,
  flvToMovController
);

/**
 * 7. WEBM to MOV conversion endpoint (via MP4 intermediate)
 */
router.post(
  '/webm-to-mov',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMovConversionParams,
  webmToMovController
);

/**
 * 8. 3GP to MOV conversion endpoint (via MP4 intermediate)
 */
router.post(
  '/3gp-to-mov',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMovConversionParams,
  threeGpToMovController
);

/**
 * 9. 3G2 to MOV conversion endpoint (via MP4 intermediate)
 */
router.post(
  '/3g2-to-mov',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMovConversionParams,
  threeG2ToMovController
);

/**
 * Health check endpoint for MOV conversions
 */
router.get('/mov/health', (req, res) => {
  res.json({
    success: true,
    service: 'MOV Conversion Service',
    status: 'operational',
    endpoints: [
      '/api/v1/convert/mp4-to-mov',
      '/api/v1/convert/mkv-to-mov',
      '/api/v1/convert/avi-to-mov',
      '/api/v1/convert/wmv-to-mov',
      '/api/v1/convert/mpeg-to-mov',
      '/api/v1/convert/flv-to-mov',
      '/api/v1/convert/webm-to-mov',
      '/api/v1/convert/3gp-to-mov',
      '/api/v1/convert/3g2-to-mov'
    ]
  });
});


export { router as toMovRoutes}