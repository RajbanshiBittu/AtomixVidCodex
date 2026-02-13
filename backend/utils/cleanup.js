import fs from 'fs/promises';
import path from 'path';
import { PATHS } from '../config/ffmpeg.js';
import logger from './logger.js';

/**
 * Delete files older than specified hours
 */
export const cleanupOldFiles = async (directory, maxAgeHours) => {
  try {
    const files = await fs.readdir(directory);
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds
    
    let deletedCount = 0;
    let freedSpace = 0;

    for (const file of files) {
      const filePath = path.join(directory, file);
      
      try {
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAge) {
          freedSpace += stats.size;
          await fs.unlink(filePath);
          deletedCount++;
          logger.info(`Deleted old file: ${file} (age: ${(fileAge / 1000 / 60 / 60).toFixed(2)} hours)`);
        }
      } catch (error) {
        logger.error(`Error processing file ${file}: ${error.message}`);
      }
    }

    if (deletedCount > 0) {
      logger.info(`Cleanup completed: Deleted ${deletedCount} files, freed ${(freedSpace / 1024 / 1024).toFixed(2)} MB`);
    } else {
      logger.debug('No files to cleanup');
    }

    return { deletedCount, freedSpace };
  } catch (error) {
    logger.error(`Cleanup error: ${error.message}`);
    throw error;
  }
};

/**
 * Cleanup both uploads and outputs directories
 */
export const cleanupAllDirectories = async () => {
  const maxAgeHours = parseInt(process.env.MAX_FILE_AGE_HOURS || '2', 10);
  
  logger.info('Starting scheduled cleanup...');

  const results = {
    uploads: { deletedCount: 0, freedSpace: 0 },
    outputs: { deletedCount: 0, freedSpace: 0 }
  };

  // Cleanup uploads directory
  try {
    results.uploads = await cleanupOldFiles(PATHS.uploads, maxAgeHours);
  } catch (error) {
    logger.error(`Failed to cleanup uploads: ${error.message}`);
  }

  // Cleanup outputs directory
  try {
    results.outputs = await cleanupOldFiles(PATHS.outputs, maxAgeHours);
  } catch (error) {
    logger.error(`Failed to cleanup outputs: ${error.message}`);
  }

  const totalDeleted = results.uploads.deletedCount + results.outputs.deletedCount;
  const totalFreed = results.uploads.freedSpace + results.outputs.freedSpace;

  logger.info(`Total cleanup: ${totalDeleted} files deleted, ${(totalFreed / 1024 / 1024).toFixed(2)} MB freed`);

  return results;
};

/**
 * Start automatic cleanup scheduler
 */
export const startCleanupScheduler = () => {
  const enabled = process.env.AUTO_CLEANUP_ENABLED === 'true';
  
  if (!enabled) {
    logger.info('Automatic cleanup is disabled');
    return null;
  }

  const intervalHours = parseInt(process.env.CLEANUP_INTERVAL_HOURS || '1', 10);
  const intervalMs = intervalHours * 60 * 60 * 1000;

  logger.info(`Starting cleanup scheduler: Running every ${intervalHours} hour(s)`);

  // Run cleanup immediately on startup
  cleanupAllDirectories().catch(error => {
    logger.error(`Initial cleanup failed: ${error.message}`);
  });

  // Schedule recurring cleanup
  const intervalId = setInterval(() => {
    cleanupAllDirectories().catch(error => {
      logger.error(`Scheduled cleanup failed: ${error.message}`);
    });
  }, intervalMs);

  return intervalId;
};

export default {
  cleanupOldFiles,
  cleanupAllDirectories,
  startCleanupScheduler
};
