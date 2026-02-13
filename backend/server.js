import application from './app.js';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { startCleanupScheduler } from './utils/cleanup.js';

dotenv.config();

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";

const server = application.listen(PORT, HOST, () => {
    logger.info('='.repeat(50));
    logger.info('Video Format Converter Backend API Server');
    logger.info('='.repeat(50));
    logger.info(`Server running on: http://${HOST}:${PORT}`);
    logger.info(`Started at: ${new Date().toISOString()}`);
    logger.info(`Max file size: ${(parseInt(process.env.MAX_FILE_SIZE || '1073741824', 10) / 1024 / 1024).toFixed(0)} MB`);
    logger.info(`Auto cleanup: ${process.env.AUTO_CLEANUP_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
    logger.info(`Virus scanning: ${process.env.ENABLE_VIRUS_SCAN === 'true' ? 'Enabled' : 'Disabled'}`);
    logger.info('='.repeat(50));
    
    // Start automatic cleanup scheduler
    const cleanupInterval = startCleanupScheduler();
    
    if (cleanupInterval) {
        logger.info('Automatic file cleanup scheduler started');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});