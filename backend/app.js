import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { toMp4Routes } from './routes/toMp4.routes.js';
import { toWebmRoutes } from './routes/toWebm.routes.js';
import { toMovRoutes } from './routes/toMov.routes.js';
import { toMpegRoutes } from './routes/toMpeg.routes.js';
import { toWmvRoutes } from './routes/toWmv.routes.js';
import { toMkvRoutes } from './routes/toMkv.routes.js';
import toAviRoutes from './routes/toAvi.routes.js';
import { toFlvRoutes } from './routes/toFlv.routes.js';
import { to3gpRoutes } from './routes/to3gp.routes.js';
import { to3g2Routes } from './routes/to3g2.routes.js';
import { cleanupRoutes } from './routes/cleanup.routes.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const application = express();

// Security middleware
application.use(helmet());

// CORS configuration - Environment-based with strict production rules
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Production-only origins
const productionOrigins = [
  'https://atomixtools.com',
  'https://www.atomixtools.com'
];

// Development origins
const developmentOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

// Build allowed origins based on environment
let allowedOrigins = [];
if (isProduction) {
  allowedOrigins = [...productionOrigins];
  // Allow additional production origins from environment variable (for staging/custom domains)
  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean);
    allowedOrigins.push(...envOrigins);
  }
} else {
  // Development mode: allow both development and production origins for testing
  allowedOrigins = [...developmentOrigins, ...productionOrigins];
}

// Health check endpoints BEFORE CORS to allow unrestricted access for K8s probes
// Liveness probe - basic application health
application.get('/healthz', (req, res) => {
  res.status(200).json({ success: true, status: 'ok' });
});

// Readiness probe - ensure routes and basic dependencies mounted
application.get('/ready', (req, res) => {
  // Optionally add deeper readiness checks here (disk space, ffmpeg availability)
  res.status(200).json({ success: true, ready: true });
});

application.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, Postman) only in development
    if (!origin) {
      if (isDevelopment) {
        logger.info('CORS: Allowing request with no origin (development mode)');
        return callback(null, true);
      } else {
        logger.warn('CORS: Rejecting request with no origin (production mode)');
        return callback(new Error('Not allowed by CORS'));
      }
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      logger.info('CORS: Allowing origin', { origin, environment: process.env.NODE_ENV });
      return callback(null, true);
    }
    
    // Reject origin with detailed server-side logging
    logger.warn('CORS: Request rejected', { 
      origin,
      environment: process.env.NODE_ENV,
      allowedOrigins,
      timestamp: new Date().toISOString()
    });
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests default
  message: {
    success: false,
    error: 'Too many requests',
    message: 'You have exceeded the request limit. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for static file downloads
  skip: (req) => req.path.startsWith('/outputs/')
});

application.use(limiter);

// Body parsing
application.use(express.json({ limit: '10mb' }));
application.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from outputs directory
application.use('/outputs', express.static(path.join(__dirname, 'outputs')));

// Request logging middleware
application.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Mount routes
application.use('/api/v1/convert', toMp4Routes);
application.use('/api/v1/convert', toWebmRoutes);
application.use('/api/v1/convert', toMovRoutes);
application.use('/api/v1/convert', toMpegRoutes);
application.use('/api/v1/convert', toWmvRoutes);
application.use('/api/v1/convert', toMkvRoutes);
application.use('/api/v1/convert', toAviRoutes);
application.use('/api/v1/convert', toFlvRoutes);
application.use('/api/v1/convert', to3gpRoutes);
application.use('/api/v1/convert', to3g2Routes);

// Cleanup routes
application.use('/api/v1/cleanup', cleanupRoutes);

// Root endpoint
application.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Video Format Converter API',
    version: '1.0.0',
    endpoints: {
      // MP4 Conversion Endpoints
      aviToMp4: '/api/v1/convert/avi-to-mp4',
      movToMp4: '/api/v1/convert/mov-to-mp4',
      mkvToMp4: '/api/v1/convert/mkv-to-mp4',
      wmvToMp4: '/api/v1/convert/wmv-to-mp4',
      flvToMp4: '/api/v1/convert/flv-to-mp4',
      mpegToMp4: '/api/v1/convert/mpeg-to-mp4',
      threeGpToMp4: '/api/v1/convert/3gp-to-mp4',
      threeG2ToMp4: '/api/v1/convert/3g2-to-mp4',
      webmToMp4: '/api/v1/convert/webm-to-mp4',
      // WebM Conversion Endpoints
      mp4ToWebm: '/api/v1/convert/mp4-to-webm',
      movToWebm: '/api/v1/convert/mov-to-webm',
      mkvToWebm: '/api/v1/convert/mkv-to-webm',
      aviToWebm: '/api/v1/convert/avi-to-webm',
      wmvToWebm: '/api/v1/convert/wmv-to-webm',
      flvToWebm: '/api/v1/convert/flv-to-webm',
      mpegToWebm: '/api/v1/convert/mpeg-to-webm',
      // MOV Conversion Endpoints
      mp4ToMov: '/api/v1/convert/mp4-to-mov',
      mkvToMov: '/api/v1/convert/mkv-to-mov',
      aviToMov: '/api/v1/convert/avi-to-mov',
      wmvToMov: '/api/v1/convert/wmv-to-mov',
      mpegToMov: '/api/v1/convert/mpeg-to-mov',
      flvToMov: '/api/v1/convert/flv-to-mov',
      webmToMov: '/api/v1/convert/webm-to-mov',
      threeGpToMov: '/api/v1/convert/3gp-to-mov',
      // MPEG Conversion Endpoints
      mp4ToMpeg: '/api/v1/convert/mp4-to-mpeg',
      mkvToMpeg: '/api/v1/convert/mkv-to-mpeg',
      aviToMpeg: '/api/v1/convert/avi-to-mpeg',
      wmvToMpeg: '/api/v1/convert/wmv-to-mpeg',
      movToMpeg: '/api/v1/convert/mov-to-mpeg',
      // WMV Conversion Endpoints
      mp4ToWmv: '/api/v1/convert/mp4-to-wmv',
      mkvToWmv: '/api/v1/convert/mkv-to-wmv',
      aviToWmv: '/api/v1/convert/avi-to-wmv',
      webmToWmv: '/api/v1/convert/webm-to-wmv',
      movToWmv: '/api/v1/convert/mov-to-wmv',
      mpegToWmv: '/api/v1/convert/mpeg-to-wmv',
      // MKV Conversion Endpoints
      mp4ToMkv: '/api/v1/convert/mp4-to-mkv',
      mkvToMkv: '/api/v1/convert/mkv-to-mkv',
      aviToMkv: '/api/v1/convert/avi-to-mkv',
      webmToMkv: '/api/v1/convert/webm-to-mkv',
      movToMkv: '/api/v1/convert/mov-to-mkv',
      // AVI Conversion Endpoints
      mp4ToAvi: '/api/v1/convert/mp4-to-avi',
      mkvToAvi: '/api/v1/convert/mkv-to-avi',
      wmvToAvi: '/api/v1/convert/wmv-to-avi',
      movToAvi: '/api/v1/convert/mov-to-avi',
      mpegToAvi: '/api/v1/convert/mpeg-to-avi'
    }
  });
});


// 404 handler
application.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler
application.use((err, req, res, next) => {
  // Log detailed error information server-side only
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  });

  // Determine if this is a client error (4xx) or server error (5xx)
  const statusCode = err.status || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;

  // Return generic message for server errors, specific message for client errors
  res.status(statusCode).json({
    success: false,
    error: isClientError ? (err.name || 'Bad Request') : 'Internal Server Error',
    message: isClientError ? (err.message || 'Invalid request') : 'An unexpected error occurred. Please try again later.'
  });
});

export default application;