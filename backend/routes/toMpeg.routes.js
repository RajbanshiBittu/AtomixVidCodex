import express from 'express';
import {
  mp4ToMpegController,
  mkvToMpegController,
  aviToMpegController,
  wmvToMpegController,
  movToMpegController,
  webmToMpegController,
  flvToMpegController,
  threeGpToMpegController,
  threeG2ToMpegController
} from '../controllers/toMpeg.controllers.js';

import {
  uploadMiddleware,
  handleUploadError,
  validateUpload
} from '../middlewares/upload.middleware.js';

import { validateMpegConversionParams } from '../middlewares/validation.middleware.js';
import { validateFileContent, scanForVirus } from '../middlewares/fileValidation.middleware.js';

const router = express.Router();

/**
 * 1. MP4 to MPEG conversion endpoint
 */
router.post(
  '/mp4-to-mpeg',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMpegConversionParams,
  mp4ToMpegController
);

/**
 * 2. MKV to MPEG conversion endpoint
 */
router.post(
  '/mkv-to-mpeg',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMpegConversionParams,
  mkvToMpegController
);

/**
 * 3. AVI to MPEG conversion endpoint
 */
router.post(
  '/avi-to-mpeg',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMpegConversionParams,
  aviToMpegController
);

/**
 * 4. WMV to MPEG conversion endpoint
 */
router.post(
  '/wmv-to-mpeg',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMpegConversionParams,
  wmvToMpegController
);

/**
 * 5. MOV to MPEG conversion endpoint
 */
router.post(
  '/mov-to-mpeg',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMpegConversionParams,
  movToMpegController
);

/**
 * 6. WEBM to MPEG conversion endpoint
 */
router.post(
  '/webm-to-mpeg',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMpegConversionParams,
  webmToMpegController
);

/**
 * 7. FLV to MPEG conversion endpoint
 */
router.post(
  '/flv-to-mpeg',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMpegConversionParams,
  flvToMpegController
);

/**
 * 8. 3GP to MPEG conversion endpoint
 */
router.post(
  '/3gp-to-mpeg',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMpegConversionParams,
  threeGpToMpegController
);

/**
 * 9. 3G2 to MPEG conversion endpoint
 */
router.post(
  '/3g2-to-mpeg',
  uploadMiddleware.single('video'),
  handleUploadError,
  validateUpload,
  validateMpegConversionParams,
  threeG2ToMpegController
);

/**
 * Health check endpoint for MPEG conversions
 */
router.get('/mpeg/health', (req, res) => {
  res.json({
    success: true,
    service: 'MPEG Conversion Service',
    status: 'operational',
    endpoints: [
      '/api/v1/convert/mp4-to-mpeg',
      '/api/v1/convert/mkv-to-mpeg',
      '/api/v1/convert/avi-to-mpeg',
      '/api/v1/convert/wmv-to-mpeg',
      '/api/v1/convert/mov-to-mpeg',
      '/api/v1/convert/webm-to-mpeg',
      '/api/v1/convert/flv-to-mpeg',
      '/api/v1/convert/3gp-to-mpeg',
      '/api/v1/convert/3g2-to-mpeg'
    ]
  });
});

export const toMpegRoutes = router;
export default router;
