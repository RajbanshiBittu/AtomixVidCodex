import express from 'express';
import {
  mp4ToWmvController,
  mkvToWmvController,
  aviToWmvController,
  webmToWmvController,
  movToWmvController,
  mpegToWmvController,
  flvToWmvController,
  threeGpToWmvController,
  threeG2ToWmvController
} from '../controllers/toWmv.controllers.js';

import {
  uploadMiddleware,
  handleUploadError,
  validateUpload
} from '../middlewares/upload.middleware.js';

import { validateWmvConversionParams } from '../middlewares/validation.middleware.js';
import { validateFileContent, scanForVirus } from '../middlewares/fileValidation.middleware.js';

const router = express.Router();

/**
 * 1. MP4 to WMV conversion endpoint
 */
router.post(
  '/mp4-to-wmv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateWmvConversionParams,
  mp4ToWmvController
);

/**
 * 2. MKV to WMV conversion endpoint
 */
router.post(
  '/mkv-to-wmv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateWmvConversionParams,
  mkvToWmvController
);

/**
 * 3. AVI to WMV conversion endpoint
 */
router.post(
  '/avi-to-wmv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateWmvConversionParams,
  aviToWmvController
);

/**
 * 4. WEBM to WMV conversion endpoint
 */
router.post(
  '/webm-to-wmv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateWmvConversionParams,
  webmToWmvController
);

/**
 * 5. MOV to WMV conversion endpoint
 */
router.post(
  '/mov-to-wmv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateWmvConversionParams,
  movToWmvController
);

/**
 * 6. MPEG to WMV conversion endpoint
 */
router.post(
  '/mpeg-to-wmv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateWmvConversionParams,
  mpegToWmvController
);

/**
 * 7. FLV to WMV conversion endpoint
 */
router.post(
  '/flv-to-wmv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateWmvConversionParams,
  flvToWmvController
);

/**
 * 8. 3GP to WMV conversion endpoint
 */
router.post(
  '/3gp-to-wmv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateWmvConversionParams,
  threeGpToWmvController
);

/**
 * 9. 3G2 to WMV conversion endpoint
 */
router.post(
  '/3g2-to-wmv',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateWmvConversionParams,
  threeG2ToWmvController
);

/**
 * Health check endpoint for WMV conversions
 */
router.get('/wmv/health', (req, res) => {
  res.json({
    success: true,
    service: 'WMV Conversion Service',
    status: 'operational',
    endpoints: [
      '/api/v1/convert/mp4-to-wmv',
      '/api/v1/convert/mkv-to-wmv',
      '/api/v1/convert/avi-to-wmv',
      '/api/v1/convert/webm-to-wmv',
      '/api/v1/convert/mov-to-wmv',
      '/api/v1/convert/mpeg-to-wmv',
      '/api/v1/convert/flv-to-wmv',
      '/api/v1/convert/3gp-to-wmv',
      '/api/v1/convert/3g2-to-wmv'
    ]
  });
});

export const toWmvRoutes = router;
export default router;
