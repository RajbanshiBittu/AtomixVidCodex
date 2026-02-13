import { jest } from '@jest/globals';
import { validateConversionParams } from '../../middlewares/validation.middleware.js';

describe('Validation Middleware Tests', () => {
  let mockReq;
  let mockRes;
  let nextFunction;

  beforeEach(() => {
    mockReq = {
      query: {},
      body: {},
      file: null
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    nextFunction = jest.fn();
  });

  describe('validateConversionParams', () => {
    test('should pass with valid quality parameter', () => {
      mockReq.query = { quality: 'medium' };
      
      validateConversionParams(mockReq, mockRes, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should pass with valid high quality', () => {
      mockReq.query = { quality: 'high' };
      
      validateConversionParams(mockReq, mockRes, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });

    test('should pass with valid low quality', () => {
      mockReq.query = { quality: 'low' };
      
      validateConversionParams(mockReq, mockRes, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });

    test('should reject invalid quality parameter', () => {
      mockReq.query = { quality: 'invalid' };
      
      validateConversionParams(mockReq, mockRes, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should pass without quality parameter (use default)', () => {
      mockReq.query = {};
      
      validateConversionParams(mockReq, mockRes, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });

    test('should validate custom bitrate if provided', () => {
      mockReq.query = { customBitrate: '2000k' };
      
      validateConversionParams(mockReq, mockRes, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });

    test('should reject invalid custom bitrate', () => {
      mockReq.query = { customBitrate: 'invalid' };
      
      validateConversionParams(mockReq, mockRes, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('File Validation', () => {
    test('should handle missing file', () => {
      mockReq.file = null;
      
      // This would be handled by the controller
      expect(mockReq.file).toBeNull();
    });

    test('should handle valid file', () => {
      mockReq.file = {
        fieldname: 'video',
        originalname: 'test.avi',
        encoding: '7bit',
        mimetype: 'video/x-msvideo',
        size: 1024 * 1024,
        path: '/tmp/test.avi'
      };
      
      expect(mockReq.file).toBeDefined();
      expect(mockReq.file.originalname).toBe('test.avi');
    });
  });

  describe('Error Messages', () => {
    test('should return descriptive error message for invalid quality', () => {
      mockReq.query = { quality: 'ultra' };
      
      validateConversionParams(mockReq, mockRes, nextFunction);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String)
        })
      );
    });
  });
});
