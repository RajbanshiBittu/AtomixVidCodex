import { jest } from '@jest/globals';

/**
 * Mock FFmpeg spawn process for unit testing
 */
export const mockFFmpegSuccess = () => {
  const mockStderr = jest.fn();
  const mockOn = jest.fn((event, callback) => {
    if (event === 'close') {
      setTimeout(() => callback(0), 100);
    }
    return mockProcess;
  });

  const mockProcess = {
    stdout: { on: jest.fn() },
    stderr: { on: mockStderr },
    on: mockOn,
    kill: jest.fn()
  };

  return {
    mockProcess,
    mockStderr,
    mockOn
  };
};

/**
 * Mock FFmpeg failure
 */
export const mockFFmpegFailure = (errorCode = 1) => {
  const mockStderr = jest.fn((event, callback) => {
    if (event === 'data') {
      callback(Buffer.from('FFmpeg error occurred'));
    }
  });

  const mockOn = jest.fn((event, callback) => {
    if (event === 'close') {
      setTimeout(() => callback(errorCode), 100);
    }
    return mockProcess;
  });

  const mockProcess = {
    stdout: { on: jest.fn() },
    stderr: { on: mockStderr },
    on: mockOn,
    kill: jest.fn()
  };

  return {
    mockProcess,
    mockStderr,
    mockOn
  };
};

/**
 * Mock FFmpeg timeout
 */
export const mockFFmpegTimeout = () => {
  const mockOn = jest.fn((event, callback) => {
    // Never call the close event to simulate timeout
    return mockProcess;
  });

  const mockProcess = {
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: mockOn,
    kill: jest.fn()
  };

  return {
    mockProcess,
    mockOn
  };
};

/**
 * Mock file system operations
 */
export const mockFileSystem = () => {
  return {
    access: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ size: 1024 * 1024 }),
    readdir: jest.fn().mockResolvedValue([]),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(Buffer.from('test'))
  };
};

/**
 * Mock spawn function
 */
export const createMockSpawn = (mockProcess) => {
  return jest.fn(() => mockProcess);
};

/**
 * Mock logger
 */
export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

/**
 * Reset all mocks
 */
export const resetAllMocks = () => {
  Object.values(mockLogger).forEach(fn => fn.mockClear());
};

export default {
  mockFFmpegSuccess,
  mockFFmpegFailure,
  mockFFmpegTimeout,
  mockFileSystem,
  createMockSpawn,
  mockLogger,
  resetAllMocks
};
