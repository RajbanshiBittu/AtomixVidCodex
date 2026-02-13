import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { jest } from '@jest/globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test environment setup
process.env.NODE_ENV = 'test';
process.env.PORT = '8081';
process.env.MAX_FILE_SIZE = '1073741824'; // 1GB
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

// Create test directories
const testDirs = [
  path.join(__dirname, '..', 'uploads-test'),
  path.join(__dirname, '..', 'outputs-test'),
  path.join(__dirname, '..', 'logs-test'),
  path.join(__dirname, 'fixtures')
];

// Global setup
beforeAll(async () => {
  for (const dir of testDirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.warn(`Warning: Could not create directory ${dir}`);
    }
  }
});

// Global teardown
afterAll(async () => {
  // Cleanup test directories
  for (const dir of testDirs) {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        await fs.unlink(path.join(dir, file)).catch(() => {});
      }
    } catch (error) {
      // Directory might not exist
    }
  }
});

// Increase timeout for video processing tests
jest.setTimeout(30000);
