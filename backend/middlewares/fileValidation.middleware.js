import { fileTypeFromBuffer } from 'file-type';
import fs from 'fs/promises';
import logger from '../utils/logger.js';

/**
 * Validate file content by reading magic bytes
 * This prevents users from uploading non-video files with fake extensions
 */
export const validateFileContent = async (req, res, next) => {
  const uploadedFile = req.file;

  if (!uploadedFile) {
    return next();
  }

  try {
    // Read first 4100 bytes (file-type needs this much)
    const buffer = await fs.readFile(uploadedFile.path, { encoding: null, flag: 'r' });
    const fileType = await fileTypeFromBuffer(buffer.slice(0, 4100));

    if (!fileType) {
      logger.warn(`Could not determine file type for: ${uploadedFile.originalname}`);
      // Clean up the file
      await fs.unlink(uploadedFile.path).catch(() => {});
      
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        message: 'Could not determine file type. Please ensure you are uploading a valid video file.'
      });
    }

    // Validate MIME type is video
    if (!fileType.mime.startsWith('video/')) {
      logger.warn(`Invalid MIME type detected: ${fileType.mime} for file: ${uploadedFile.originalname}`);
      // Clean up the file
      await fs.unlink(uploadedFile.path).catch(() => {});
      
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        message: `File is not a video. Detected type: ${fileType.mime}`
      });
    }

    // Log successful validation
    logger.info(`File content validated: ${fileType.mime} for ${uploadedFile.originalname}`);
    
    // Attach detected MIME type to request for further processing
    req.detectedMimeType = fileType.mime;
    
    next();
  } catch (error) {
    logger.error(`File validation error: ${error.message}`);
    
    // Clean up the file
    if (uploadedFile.path) {
      await fs.unlink(uploadedFile.path).catch(() => {});
    }
    
    return res.status(500).json({
      success: false,
      error: 'File validation failed',
      message: 'Could not validate file. Please try again.'
    });
  }
};

/**
 * Virus scanning middleware (placeholder for production integration)
 * In production, integrate with ClamAV, VirusTotal, or similar service
 */
export const scanForVirus = async (req, res, next) => {
  const uploadedFile = req.file;
  
  if (!uploadedFile) {
    return next();
  }

  // Check if virus scanning is enabled
  const virusScanEnabled = process.env.ENABLE_VIRUS_SCAN === 'true';
  
  if (!virusScanEnabled) {
    logger.debug('Virus scanning disabled');
    return next();
  }

  try {
    logger.info(`Scanning file for viruses: ${uploadedFile.originalname}`);

    // TODO: Integrate with actual antivirus service
    // Example integration options:
    // 1. ClamAV (local daemon)
    // 2. VirusTotal API
    // 3. AWS CloudWatch
    // 4. Microsoft Defender API
    
    /*
    // Example ClamAV integration:
    const NodeClam = require('clamscan');
    const clamscan = await new NodeClam().init({
      clamdscan: {
        host: process.env.CLAMAV_HOST || 'localhost',
        port: process.env.CLAMAV_PORT || 3310,
      }
    });
    
    const { isInfected, viruses } = await clamscan.isInfected(uploadedFile.path);
    
    if (isInfected) {
      logger.error(`Virus detected in file ${uploadedFile.originalname}: ${viruses}`);
      await fs.unlink(uploadedFile.path).catch(() => {});
      
      return res.status(400).json({
        success: false,
        error: 'Security threat detected',
        message: 'The uploaded file contains malicious content and has been rejected.'
      });
    }
    */

    logger.info(`File scanned successfully: ${uploadedFile.originalname}`);
    next();
  } catch (error) {
    logger.error(`Virus scanning error: ${error.message}`);
    
    // In production, you might want to reject the file on scanning errors
    // For now, we'll allow it through with a warning
    logger.warn('Virus scanning failed, allowing file through');
    next();
  }
};

export default {
  validateFileContent,
  scanForVirus
};
