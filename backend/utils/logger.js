import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, '..', 'logs');

// Custom filter to exclude error and success logs from combined.log
const excludeErrorAndSuccess = winston.format((info) => {
  if (info.level === 'error' || info.message.toLowerCase().includes('success')) {
    return false;
  }
  return info;
});

// Custom filter for success logs only
const successOnly = winston.format((info) => {
  if (info.message.toLowerCase().includes('success') || 
      info.message.toLowerCase().includes('completed') ||
      info.message.toLowerCase().includes('converted')) {
    return info;
  }
  return false;
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Error logs only - only error level
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: "error",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Success logs only - successful operations
    new winston.transports.File({ 
      filename: path.join(logsDir, 'success.log'),
      format: winston.format.combine(
        successOnly(),
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Combined logs - everything except errors and success
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      format: winston.format.combine(
        excludeErrorAndSuccess(),
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

export default logger;