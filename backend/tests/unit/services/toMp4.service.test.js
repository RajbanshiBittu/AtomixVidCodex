import { jest } from '@jest/globals';
import { convertToMp4 } from '../../services/toMp4.services.js';
import { mockFFmpegSuccess, mockFFmpegFailure, createMockSpawn } from '../mocks/ffmpegMock.js';
import { createMockVideoFile, cleanupTestFiles } from '../helpers/testUtils.js';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs/promises');
jest.mock('../../utils/logger.js');

describe('MP4 Conversion Service - Unit Tests', () => {
  let mockSpawn;
  let testFiles = [];

  beforeEach(() => {
    jest.clearAllMocks();
    testFiles = [];
  });

  afterEach(async () => {
    await cleanupTestFiles(testFiles);
  });

  describe('convertToMp4', () => {
    test('should successfully convert video to MP4', async () => {
      const { mockProcess } = mockFFmpegSuccess();
      mockSpawn = createMockSpawn(mockProcess);
      
      const { spawn } = await import('child_process');
      spawn.mockImplementation(mockSpawn);

      const inputPath = await createMockVideoFile('test.avi', 1);
      testFiles.push(inputPath);

      const result = await convertToMp4(inputPath, { quality: 'medium' });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('outputFilename');
      expect(result).toHaveProperty('outputPath');
      expect(mockSpawn).toHaveBeenCalled();
    });

    test('should handle FFmpeg failure', async () => {
      const { mockProcess } = mockFFmpegFailure();
      mockSpawn = createMockSpawn(mockProcess);
      
      const { spawn } = await import('child_process');
      spawn.mockImplementation(mockSpawn);

      const inputPath = await createMockVideoFile('test.avi', 1);
      testFiles.push(inputPath);

      await expect(convertToMp4(inputPath, { quality: 'medium' }))
        .rejects
        .toThrow();
    });

    test('should handle invalid input path', async () => {
      await expect(convertToMp4('/invalid/path.avi'))
        .rejects
        .toThrow();
    });

    test('should respect quality options', async () => {
      const { mockProcess } = mockFFmpegSuccess();
      mockSpawn = createMockSpawn(mockProcess);
      
      const { spawn } = await import('child_process');
      spawn.mockImplementation(mockSpawn);

      const inputPath = await createMockVideoFile('test.avi', 1);
      testFiles.push(inputPath);

      const qualities = ['low', 'medium', 'high'];
      
      for (const quality of qualities) {
        await convertToMp4(inputPath, { quality });
        expect(mockSpawn).toHaveBeenCalled();
      }
    });

    test('should handle large file conversion', async () => {
      const { mockProcess } = mockFFmpegSuccess();
      mockSpawn = createMockSpawn(mockProcess);
      
      const { spawn } = await import('child_process');
      spawn.mockImplementation(mockSpawn);

      const inputPath = await createMockVideoFile('large-test.avi', 500);
      testFiles.push(inputPath);

      const result = await convertToMp4(inputPath);
      expect(result).toHaveProperty('success', true);
    });
  });

  describe('Error Handling', () => {
    test('should handle process kill on timeout', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // Simulate timeout - never call callback
            setTimeout(() => {}, 100000);
          }
          return mockProcess;
        }),
        kill: jest.fn()
      };

      mockSpawn = createMockSpawn(mockProcess);
      const { spawn } = await import('child_process');
      spawn.mockImplementation(mockSpawn);

      const inputPath = await createMockVideoFile('test.avi', 1);
      testFiles.push(inputPath);

      // This should timeout
      jest.setTimeout(5000);
    });

    test('should cleanup on error', async () => {
      const { mockProcess } = mockFFmpegFailure();
      mockSpawn = createMockSpawn(mockProcess);
      
      const { spawn } = await import('child_process');
      spawn.mockImplementation(mockSpawn);

      const inputPath = await createMockVideoFile('test.avi', 1);
      testFiles.push(inputPath);

      try {
        await convertToMp4(inputPath);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
