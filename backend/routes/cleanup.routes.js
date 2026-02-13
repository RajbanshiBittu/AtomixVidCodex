import express from 'express';
import { cleanupAllDirectories } from '../utils/cleanup.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Manual cleanup endpoint
 * DELETE /api/v1/cleanup
 * Triggers immediate cleanup of old files
 */
router.delete('/', async (req, res) => {
  try {
    logger.info('Manual cleanup triggered');
    
    const results = await cleanupAllDirectories();
    
    const totalDeleted = results.uploads.deletedCount + results.outputs.deletedCount;
    const totalFreed = results.uploads.freedSpace + results.outputs.freedSpace;

    res.status(200).json({
      success: true,
      message: 'Cleanup completed successfully',
      data: {
        uploads: {
          filesDeleted: results.uploads.deletedCount,
          spaceFree: `${(results.uploads.freedSpace / 1024 / 1024).toFixed(2)} MB`
        },
        outputs: {
          filesDeleted: results.outputs.deletedCount,
          spaceFreed: `${(results.outputs.freedSpace / 1024 / 1024).toFixed(2)} MB`
        },
        total: {
          filesDeleted: totalDeleted,
          spaceFreed: `${(totalFreed / 1024 / 1024).toFixed(2)} MB`
        }
      }
    });
  } catch (error) {
    logger.error(`Manual cleanup failed: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      message: error.message
    });
  }
});

/**
 * Get cleanup status
 * GET /api/v1/cleanup/status
 * Returns current cleanup configuration
 */
router.get('/status', (req, res) => {
  const enabled = process.env.AUTO_CLEANUP_ENABLED === 'true';
  const intervalHours = parseInt(process.env.CLEANUP_INTERVAL_HOURS || '1', 10);
  const maxAgeHours = parseInt(process.env.MAX_FILE_AGE_HOURS || '2', 10);

  res.status(200).json({
    success: true,
    data: {
      autoCleanupEnabled: enabled,
      cleanupIntervalHours: intervalHours,
      maxFileAgeHours: maxAgeHours,
      nextCleanup: enabled 
        ? `Every ${intervalHours} hour(s)` 
        : 'Disabled'
    }
  });
});

export { router as cleanupRoutes };
