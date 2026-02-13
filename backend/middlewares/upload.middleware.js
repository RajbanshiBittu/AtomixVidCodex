import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import { PATHS, FFMPEG_CONFIG, getAllSupportedExtensions } from '../config/ffmpeg.js';
import logger from '../utils/logger.js';

/**
 * Ensure upload directory exists
 */
const ensureUploadDir = async () => {
  try {
    await fs.access(PATHS.uploads);
  } catch {
    await fs.mkdir(PATHS.uploads, { recursive: true });
    logger.info(`Created uploads directory: ${PATHS.uploads}`);
  }
};

/**
 * Configure multer storage
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureUploadDir();
      cb(null, PATHS.uploads);
    } catch (error) {
      logger.error('Error creating upload directory:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uniqueId}${ext}`;
    cb(null, filename);
  }
});

/**
 * File filter to validate uploaded files
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const supportedExtensions = getAllSupportedExtensions();

  if (!supportedExtensions.includes(ext)) {
    const error = new Error(
      `Unsupported file format: ${ext}. Supported formats: ${supportedExtensions.join(', ')}`
    );
    error.status = 400;
    return cb(error, false);
  }

  // Additional MIME type validation
  const expectedMimePattern = /^video\//;
  if (!expectedMimePattern.test(file.mimetype)) {
    const error = new Error(
      `Invalid MIME type: ${file.mimetype}. Expected video/* format.`
    );
    error.status = 400;
    return cb(error, false);
  }

  cb(null, true);
};

/**
 * Configure multer upload middleware
 */
export const uploadMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: FFMPEG_CONFIG.maxFileSize,
    files: 1
  }
});

/**
 * Error handler for upload errors
 */
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: `Maximum file size is ${FFMPEG_CONFIG.maxFileSize / (1024 * 1024)}MB`
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files',
        message: 'Only one file can be uploaded at a time'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'Upload error',
      message: err.message
    });
  }

  if (err) {
    logger.error('Upload error:', err);
    return res.status(err.status || 500).json({
      success: false,
      error: 'Upload failed',
      message: err.message
    });
  }

  next();
};

/**
 * Validate file upload
 */
export const validateUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded',
      message: 'Please upload a video file'
    });
  }

  logger.info(`File uploaded: ${req.file.filename} (${req.file.size} bytes)`);
  next();
};

export default {
  uploadMiddleware,
  handleUploadError,
  validateUpload
};
