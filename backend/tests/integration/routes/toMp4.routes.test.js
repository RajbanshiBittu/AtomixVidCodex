import request from 'supertest';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import application from '../../app.js';
import { createMockVideoFile, cleanupTestFiles, validateResponseStructure } from '../helpers/testUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Integration Tests - MP4 Conversion Routes', () => {
  let testFiles = [];

  afterEach(async () => {
    await cleanupTestFiles(testFiles);
  });

  describe('POST /api/v1/convert/avi-to-mp4', () => {
    test('should successfully convert AVI to MP4', async () => {
      const testFile = await createMockVideoFile('test.avi', 1);
      testFiles.push(testFile);

      const response = await request(application)
        .post('/api/v1/convert/avi-to-mp4')
        .attach('video', testFile)
        .expect('Content-Type', /json/)
        .expect(200);

      validateResponseStructure(response, 200);
      expect(response.body.data).toHaveProperty('outputFilename');
      expect(response.body.data).toHaveProperty('outputPath');
    }, 30000);

    test('should reject request without file', async () => {
      const response = await request(application)
        .post('/api/v1/convert/avi-to-mp4')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject oversized file', async () => {
      // Create a file larger than 1GB (simulated)
      const testFile = await createMockVideoFile('large.avi', 1100);
      testFiles.push(testFile);

      const response = await request(application)
        .post('/api/v1/convert/avi-to-mp4')
        .attach('video', testFile)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    }, 30000);

    test('should handle quality parameter', async () => {
      const testFile = await createMockVideoFile('test.avi', 1);
      testFiles.push(testFile);

      const response = await request(application)
        .post('/api/v1/convert/avi-to-mp4')
        .query({ quality: 'high' })
        .attach('video', testFile)
        .expect(200);

      expect(response.body.success).toBe(true);
    }, 30000);

    test('should reject invalid quality parameter', async () => {
      const testFile = await createMockVideoFile('test.avi', 1);
      testFiles.push(testFile);

      const response = await request(application)
        .post('/api/v1/convert/avi-to-mp4')
        .query({ quality: 'invalid' })
        .attach('video', testFile)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/convert/mov-to-mp4', () => {
    test('should successfully convert MOV to MP4', async () => {
      const testFile = await createMockVideoFile('test.mov', 1);
      testFiles.push(testFile);

      const response = await request(application)
        .post('/api/v1/convert/mov-to-mp4')
        .attach('video', testFile)
        .expect(200);

      validateResponseStructure(response, 200);
      expect(response.body.data).toHaveProperty('outputFilename');
    }, 30000);
  });

  describe('POST /api/v1/convert/mkv-to-mp4', () => {
    test('should successfully convert MKV to MP4', async () => {
      const testFile = await createMockVideoFile('test.mkv', 1);
      testFiles.push(testFile);

      const response = await request(application)
        .post('/api/v1/convert/mkv-to-mp4')
        .attach('video', testFile)
        .expect(200);

      validateResponseStructure(response, 200);
    }, 30000);
  });

  describe('Error Handling', () => {
    test('should handle corrupted video file', async () => {
      const testFile = await createMockVideoFile('corrupted.avi', 0.1);
      testFiles.push(testFile);
      
      // Write corrupted data
      await fs.writeFile(testFile, 'corrupted data');

      const response = await request(application)
        .post('/api/v1/convert/avi-to-mp4')
        .attach('video', testFile)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should handle wrong format upload', async () => {
      const testFile = await createMockVideoFile('test.txt', 0.1);
      testFiles.push(testFile);

      const response = await request(application)
        .post('/api/v1/convert/avi-to-mp4')
        .attach('video', testFile)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      const testFile = await createMockVideoFile('test.avi', 0.5);
      testFiles.push(testFile);

      // Make multiple requests quickly
      const requests = Array(10).fill(null).map(() =>
        request(application)
          .post('/api/v1/convert/avi-to-mp4')
          .attach('video', testFile)
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      
      expect(rateLimited).toBe(true);
    }, 60000);
  });
});
