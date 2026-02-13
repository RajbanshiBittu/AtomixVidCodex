import Joi from 'joi';
import { 
  CONVERSION_PRESETS, 
  MOV_CONVERSION_PRESETS, 
  MPEG_CONVERSION_PRESETS, 
  WMV_CONVERSION_PRESETS, 
  MKV_CONVERSION_PRESETS, 
  AVI_CONVERSION_PRESETS,
  FLV_CONVERSION_PRESETS,
  THREE_GP_CONVERSION_PRESETS,
  THREE_G2_CONVERSION_PRESETS
} from '../config/ffmpeg.js';

/**
 * Schema for conversion query parameters (MP4/WebM)
 */
const conversionQuerySchema = Joi.object({
  quality: Joi.string()
    .valid(...Object.keys(CONVERSION_PRESETS))
    .default('medium')
    .messages({
      'any.only': 'Quality must be one of: high, medium, low'
    }),
  preserveMetadata: Joi.boolean()
    .default(true),
  customBitrate: Joi.string()
    .pattern(/^\d+[kKmM]$/)
    .optional()
    .messages({
      'string.pattern.base': 'Custom bitrate must be in format: 1000k or 1M'
    })
});

/**
 * Schema for MOV conversion query parameters
 */
const movConversionQuerySchema = Joi.object({
  quality: Joi.string()
    .valid(...Object.keys(MOV_CONVERSION_PRESETS))
    .default('medium')
    .messages({
      'any.only': 'Quality must be one of: high, medium, low'
    }),
  preserveMetadata: Joi.boolean()
    .default(true),
  customBitrate: Joi.string()
    .pattern(/^\d+[kKmM]$/)
    .optional()
    .messages({
      'string.pattern.base': 'Custom bitrate must be in format: 1000k or 1M'
    })
});

/**
 * Schema for MPEG conversion query parameters
 */
const mpegConversionQuerySchema = Joi.object({
  quality: Joi.string()
    .valid(...Object.keys(MPEG_CONVERSION_PRESETS))
    .default('medium')
    .messages({
      'any.only': 'Quality must be one of: high, medium, low'
    }),
  preserveMetadata: Joi.boolean()
    .default(true),
  customBitrate: Joi.string()
    .pattern(/^\d+[kKmM]$/)
    .optional()
    .messages({
      'string.pattern.base': 'Custom bitrate must be in format: 1000k or 1M'
    })
});

/**
 * Schema for WMV conversion query parameters
 */
const wmvConversionQuerySchema = Joi.object({
  quality: Joi.string()
    .valid(...Object.keys(WMV_CONVERSION_PRESETS))
    .default('medium')
    .messages({
      'any.only': 'Quality must be one of: high, medium, low'
    }),
  preserveMetadata: Joi.boolean()
    .default(true),
  customBitrate: Joi.string()
    .pattern(/^\d+[kKmM]$/)
    .optional()
    .messages({
      'string.pattern.base': 'Custom bitrate must be in format: 1000k or 1M'
    })
});

/**
 * Schema for MKV conversion query parameters
 */
const mkvConversionQuerySchema = Joi.object({
  quality: Joi.string()
    .valid(...Object.keys(MKV_CONVERSION_PRESETS))
    .default('medium')
    .messages({
      'any.only': 'Quality must be one of: high, medium, low'
    }),
  preserveMetadata: Joi.boolean()
    .default(true),
  customBitrate: Joi.string()
    .pattern(/^\d+[kKmM]$/)
    .optional()
    .messages({
      'string.pattern.base': 'Custom bitrate must be in format: 1000k or 1M'
    })
});

/**
 * Schema for AVI conversion query parameters
 */
const aviConversionQuerySchema = Joi.object({
  quality: Joi.string()
    .valid(...Object.keys(AVI_CONVERSION_PRESETS))
    .default('medium')
    .messages({
      'any.only': 'Quality must be one of: high, medium, low'
    }),
  preserveMetadata: Joi.boolean()
    .default(true),
  customBitrate: Joi.string()
    .pattern(/^\d+[kKmM]$/)
    .optional()
    .messages({
      'string.pattern.base': 'Custom bitrate must be in format: 1000k or 1M'
    })
});

/**
 * Schema for FLV conversion query parameters
 */
const flvConversionQuerySchema = Joi.object({
  quality: Joi.string()
    .valid(...Object.keys(FLV_CONVERSION_PRESETS))
    .default('medium')
    .messages({
      'any.only': 'Quality must be one of: high, medium, low'
    }),
  preserveMetadata: Joi.boolean()
    .default(true),
  customBitrate: Joi.string()
    .pattern(/^\d+[kKmM]$/)
    .optional()
    .messages({
      'string.pattern.base': 'Custom bitrate must be in format: 1000k or 1M'
    })
});

/**
 * Schema for 3GP conversion query parameters
 */
const threeGpConversionQuerySchema = Joi.object({
  quality: Joi.string()
    .valid(...Object.keys(THREE_GP_CONVERSION_PRESETS))
    .default('medium')
    .messages({
      'any.only': 'Quality must be one of: high, medium, low'
    }),
  preserveMetadata: Joi.boolean()
    .default(true)
});

/**
 * Schema for 3G2 conversion query parameters
 */
const threeG2ConversionQuerySchema = Joi.object({
  quality: Joi.string()
    .valid(...Object.keys(THREE_G2_CONVERSION_PRESETS))
    .default('medium')
    .messages({
      'any.only': 'Quality must be one of: high, medium, low'
    }),
  preserveMetadata: Joi.boolean()
    .default(true)
});

/**
 * Middleware to validate conversion parameters (MP4/WebM)
 */
export const validateConversionParams = (req, res, next) => {
  const { error, value } = conversionQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  req.validatedQuery = value;
  next();
};

/**
 * Middleware to validate MOV conversion parameters
 */
export const validateMovConversionParams = (req, res, next) => {
  const { error, value } = movConversionQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  req.validatedQuery = value;
  next();
};

/**
 * Middleware to validate MPEG conversion parameters
 */
export const validateMpegConversionParams = (req, res, next) => {
  const { error, value } = mpegConversionQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  req.validatedQuery = value;
  next();
};

/**
 * Middleware to validate WMV conversion parameters
 */
export const validateWmvConversionParams = (req, res, next) => {
  const { error, value } = wmvConversionQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  req.validatedQuery = value;
  next();
};

/**
 * Middleware to validate MKV conversion parameters
 */
export const validateMkvConversionParams = (req, res, next) => {
  const { error, value } = mkvConversionQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  req.validatedQuery = value;
  next();
};

/**
 * Middleware to validate AVI conversion parameters
 */
export const validateAviConversionParams = (req, res, next) => {
  const { error, value } = aviConversionQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  req.validatedQuery = value;
  next();
};

/**
 * Middleware to validate FLV conversion parameters
 */
export const validateFlvConversionParams = (req, res, next) => {
  const { error, value } = flvConversionQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  req.validatedQuery = value;
  next();
};

/**
 * Middleware to validate 3GP conversion parameters
 */
export const validate3gpConversionParams = (req, res, next) => {
  const { error, value } = threeGpConversionQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }
  req.validatedQuery = value;
  next();
};

/**
 * Middleware to validate 3G2 conversion parameters
 */
export const validate3g2ConversionParams = (req, res, next) => {
  const { error, value } = threeG2ConversionQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  req.validatedQuery = value;
  next();
};

/**
 * Validate request body for batch conversions
 */
const batchConversionSchema = Joi.object({
  files: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'At least one file must be specified',
      'array.max': 'Maximum 10 files can be converted at once'
    }),
  quality: Joi.string()
    .valid(...Object.keys(CONVERSION_PRESETS))
    .default('medium')
});

export const validateBatchConversion = (req, res, next) => {
  const { error, value } = batchConversionSchema.validate(req.body, {
    abortEarly: false
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  req.validatedBody = value;
  next();
};

export default {
  validateConversionParams,
  validateMovConversionParams,
  validateMpegConversionParams,
  validateWmvConversionParams,
  validateMkvConversionParams,
  validateAviConversionParams,
  validateFlvConversionParams,
  validate3gpConversionParams,
  validate3g2ConversionParams,
  validateBatchConversion
};
