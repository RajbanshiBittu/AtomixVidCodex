import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create a mock video file for testing
 */
export const createMockVideoFile = async (filename, sizeInMB = 1) => {
  const fixturesDir = path.join(__dirname, '..', 'fixtures');
  await fs.mkdir(fixturesDir, { recursive: true });
  
  const filePath = path.join(fixturesDir, filename);
  const sizeInBytes = sizeInMB * 1024 * 1024;
  const buffer = Buffer.alloc(sizeInBytes, 'a');
  
  await fs.writeFile(filePath, buffer);
  return filePath;
};

/**
 * Create a corrupted video file
 */
export const createCorruptedVideoFile = async (filename) => {
  const fixturesDir = path.join(__dirname, '..', 'fixtures');
  await fs.mkdir(fixturesDir, { recursive: true });
  
  const filePath = path.join(fixturesDir, filename);
  await fs.writeFile(filePath, 'corrupted data');
  return filePath;
};

/**
 * Clean up test files
 */
export const cleanupTestFiles = async (filePaths) => {
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist
    }
  }
};

/**
 * Get all conversion endpoints
 */
export const getAllConversionEndpoints = () => {
  const formats = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'mpeg', 'flv', 'webm', '3gp', '3g2'];
  const endpoints = [];
  
  for (const targetFormat of formats) {
    for (const sourceFormat of formats) {
      if (sourceFormat !== targetFormat) {
        endpoints.push({
          source: sourceFormat,
          target: targetFormat,
          endpoint: `/api/v1/convert/${sourceFormat}-to-${targetFormat}`,
          method: 'POST'
        });
      }
    }
  }
  
  return endpoints;
};

/**
 * Create test report data structure
 */
export class TestReport {
  constructor() {
    this.testResults = [];
    this.summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      startTime: new Date(),
      endTime: null,
      duration: 0
    };
  }

  addResult(result) {
    this.testResults.push({
      ...result,
      timestamp: new Date()
    });
    this.summary.total++;
    if (result.status === 'passed') {
      this.summary.passed++;
    } else if (result.status === 'failed') {
      this.summary.failed++;
    } else if (result.status === 'skipped') {
      this.summary.skipped++;
    }
  }

  finalize() {
    this.summary.endTime = new Date();
    this.summary.duration = this.summary.endTime - this.summary.startTime;
  }

  getSummary() {
    return {
      ...this.summary,
      passRate: ((this.summary.passed / this.summary.total) * 100).toFixed(2) + '%',
      failRate: ((this.summary.failed / this.summary.total) * 100).toFixed(2) + '%'
    };
  }

  getResults() {
    return this.testResults;
  }
}

/**
 * Validate response structure
 */
export const validateResponseStructure = (response, expectedStatus = 200) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('success');
  
  if (response.body.success) {
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('data');
  } else {
    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
  }
};

/**
 * Wait for a specified time (for rate limiting tests)
 */
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default {
  createMockVideoFile,
  createCorruptedVideoFile,
  cleanupTestFiles,
  getAllConversionEndpoints,
  TestReport,
  validateResponseStructure,
  wait
};
