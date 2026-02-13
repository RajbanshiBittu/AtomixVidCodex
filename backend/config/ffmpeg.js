import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Supported video format configurations
 * Each format includes validation and conversion settings
 */
export const SUPPORTED_FORMATS = {
  AVI: {
    extensions: ['.avi'],
    mimeTypes: ['video/x-msvideo', 'video/avi'],
    name: 'AVI',
    description: 'Audio Video Interleave'
  },
  MOV: {
    extensions: ['.mov', '.qt'],
    mimeTypes: ['video/quicktime'],
    name: 'MOV',
    description: 'QuickTime Movie'
  },
  MKV: {
    extensions: ['.mkv'],
    mimeTypes: ['video/x-matroska'],
    name: 'MKV',
    description: 'Matroska Video'
  },
  WMV: {
    extensions: ['.wmv'],
    mimeTypes: ['video/x-ms-wmv'],
    name: 'WMV',
    description: 'Windows Media Video'
  },
  FLV: {
    extensions: ['.flv'],
    mimeTypes: ['video/x-flv'],
    name: 'FLV',
    description: 'Flash Video'
  },
  MPEG: {
    extensions: ['.mpeg', '.mpg', '.mpe'],
    mimeTypes: ['video/mpeg'],
    name: 'MPEG',
    description: 'Moving Picture Experts Group'
  },
  '3GP': {
    extensions: ['.3gp'],
    mimeTypes: ['video/3gpp'],
    name: '3GP',
    description: '3GPP Multimedia'
  },
  '3G2': {
    extensions: ['.3g2'],
    mimeTypes: ['video/3gpp2'],
    name: '3G2',
    description: '3GPP2 Multimedia'
  },
  WEBM: {
    extensions: ['.webm'],
    mimeTypes: ['video/webm'],
    name: 'WEBM',
    description: 'WebM Video'
  },
  MP4: {
    extensions: ['.mp4'],
    mimeTypes: ['video/mp4'],
    name: 'MP4',
    description: 'MPEG-4 Video'
  }
};

/**
 * FFmpeg conversion presets for different quality levels (MP4)
 * Using CRF (Constant Rate Factor) for automatic bitrate calculation
 * CRF provides better quality per file size with Variable Bitrate (VBR)
 */
export const CONVERSION_PRESETS = {
  high: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '192k',
    preset: 'slow',
    crf: 18,
    description: 'High quality - CRF 18 (visually lossless)'
  },
  medium: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '128k',
    preset: 'medium',
    crf: 23,
    description: 'Balanced quality - CRF 23 (recommended)'
  },
  low: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '96k',
    preset: 'fast',
    crf: 28,
    description: 'Lower quality - CRF 28 (smaller files)'
  }
};

/**
 * FFmpeg conversion presets for WebM output
 * Using CRF for VP9 with automatic bitrate calculation
 * Optimized for faster encoding speeds to handle 4K conversions
 */
export const WEBM_CONVERSION_PRESETS = {
  high: {
    videoCodec: 'libvpx-vp9',
    audioCodec: 'libopus',
    audioBitrate: '192k',
    crf: 23,
    speed: 4, // Increased from 1 to 4 for faster encoding
    description: 'High quality WebM - CRF 23, speed 4'
  },
  medium: {
    videoCodec: 'libvpx-vp9',
    audioCodec: 'libopus',
    audioBitrate: '128k',
    crf: 31,
    speed: 5, // Increased from 2 to 5 for faster encoding
    description: 'Balanced WebM - CRF 31, speed 5'
  },
  low: {
    videoCodec: 'libvpx-vp9',
    audioCodec: 'libopus',
    audioBitrate: '96k',
    crf: 37,
    speed: 6, // Increased from 4 to 6 for faster encoding
    description: 'Lower quality WebM - CRF 37, speed 6'
  }
};

/**
 * FFmpeg conversion presets for MOV output
 * Optimized for QuickTime compatibility with CRF encoding
 */
export const MOV_CONVERSION_PRESETS = {
  high: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '320k',
    preset: 'slow',
    crf: 18,
    profile: 'high',
    level: '4.1',
    description: 'High quality MOV - CRF 18'
  },
  medium: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '192k',
    preset: 'medium',
    crf: 23,
    profile: 'high',
    level: '4.0',
    description: 'Balanced MOV - CRF 23'
  },
  low: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '128k',
    preset: 'fast',
    crf: 28,
    profile: 'main',
    level: '3.1',
    description: 'Lower quality MOV - CRF 28'
  }
};

/**
 * FFmpeg conversion presets for MPEG output
 * Using MPEG-2 video with MP2 audio
 * MPEG-2 doesn't support CRF, using VBR with average bitrate targets
 */
export const MPEG_CONVERSION_PRESETS = {
  high: {
    videoCodec: 'mpeg2video',
    audioCodec: 'mp2',
    audioBitrate: '384k',
    avgBitrate: '8000k',
    maxRate: '9000k',
    bufferSize: '4096k',
    format: 'mpeg',
    description: 'High quality MPEG - VBR with 8000k avg'
  },
  medium: {
    videoCodec: 'mpeg2video',
    audioCodec: 'mp2',
    audioBitrate: '256k',
    avgBitrate: '4000k',
    maxRate: '5000k',
    bufferSize: '2048k',
    format: 'mpeg',
    description: 'Balanced MPEG - VBR with 4000k avg'
  },
  low: {
    videoCodec: 'mpeg2video',
    audioCodec: 'mp2',
    audioBitrate: '192k',
    avgBitrate: '2000k',
    maxRate: '3000k',
    bufferSize: '1024k',
    format: 'mpeg',
    description: 'Lower quality MPEG - VBR with 2000k avg'
  }
};

/**
 * FFmpeg conversion presets for WMV output
 * Using Windows Media Video 9 (WMV2) with WMA v2 audio
 * WMV2 doesn't support CRF, using VBR with average bitrate targets
 * Optimized for faster encoding speeds to handle 4K conversions
 */
export const WMV_CONVERSION_PRESETS = {
  high: {
    videoCodec: 'wmv2',
    audioCodec: 'wmav2',
    audioBitrate: '192k',
    avgBitrate: '4000k', // Reduced from 6000k for faster encoding
    maxRate: '6000k', // Reduced from 8000k
    bufferSize: '2048k', // Reduced from 3072k
    gopSize: 250,
    format: 'asf',
    description: 'High quality WMV - VBR with 4000k avg'
  },
  medium: {
    videoCodec: 'wmv2',
    audioCodec: 'wmav2',
    audioBitrate: '128k',
    avgBitrate: '2000k', // Reduced from 3000k for faster encoding
    maxRate: '3000k', // Reduced from 4000k
    bufferSize: '1024k', // Reduced from 1536k
    gopSize: 250,
    format: 'asf',
    description: 'Balanced WMV - VBR with 2000k avg'
  },
  low: {
    videoCodec: 'wmv2',
    audioCodec: 'wmav2',
    audioBitrate: '96k',
    avgBitrate: '1000k', // Reduced from 1500k for faster encoding
    maxRate: '1500k', // Reduced from 2000k
    bufferSize: '512k', // Reduced from 768k
    gopSize: 250,
    format: 'asf',
    description: 'Lower quality WMV - VBR with 1000k avg'
  }
};

/**
 * FFmpeg conversion presets for MKV output
 * Using H.264 with AAC and CRF for maximum compatibility with Matroska container
 */
export const MKV_CONVERSION_PRESETS = {
  high: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '320k',
    preset: 'slow',
    crf: 18,
    profile: 'high',
    level: '4.1',
    description: 'High quality MKV - CRF 18'
  },
  medium: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '192k',
    preset: 'medium',
    crf: 23,
    profile: 'high',
    level: '4.0',
    description: 'Balanced MKV - CRF 23'
  },
  low: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '128k',
    preset: 'fast',
    crf: 28,
    profile: 'main',
    level: '3.1',
    description: 'Lower quality MKV - CRF 28'
  }
};

/**
 * Default FFmpeg configuration
 */
export const FFMPEG_CONFIG = {
  path: ffmpegPath,
  timeout: parseInt(process.env.FFMPEG_TIMEOUT || '1800000', 10), // 30 minutes default (increased for 4K)
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '1073741824', 10), // 1GB default (was 500MB)
  defaultPreset: 'medium',
  outputFormat: 'mp4',
  // Auto-downscaling configuration for large resolutions
  maxResolution: {
    width: 1920,
    height: 1080,
    enabled: true // Set to false to disable auto-downscaling
  }
};

/**
 * Directory paths configuration
 */
export const PATHS = {
  uploads: path.join(__dirname, '..', 'uploads'),
  outputs: path.join(__dirname, '..', 'outputs'),
  logs: path.join(__dirname, '..', 'logs')
};

/**
 * Get all supported file extensions
 */
export const getAllSupportedExtensions = () => {
  return Object.values(SUPPORTED_FORMATS)
    .flatMap(format => format.extensions);
};

/**
 * Get all supported MIME types
 */
export const getAllSupportedMimeTypes = () => {
  return Object.values(SUPPORTED_FORMATS)
    .flatMap(format => format.mimeTypes);
};

/**
 * Check if a file extension is supported
 */
export const isSupportedExtension = (extension) => {
  const ext = extension.toLowerCase();
  return getAllSupportedExtensions().includes(ext);
};

/**
 * Check if a MIME type is supported
 */
export const isSupportedMimeType = (mimeType) => {
  return getAllSupportedMimeTypes().includes(mimeType);
};

/**
 * Get format info by extension
 */
export const getFormatByExtension = (extension) => {
  const ext = extension.toLowerCase();
  return Object.values(SUPPORTED_FORMATS).find(format =>
    format.extensions.includes(ext)
  );
};

/**
 * AVI conversion presets
 * Using MPEG-4 video with MP3 audio and qscale (VBR quality-based encoding)
 * qscale is MPEG-4's equivalent to CRF
 */
export const AVI_CONVERSION_PRESETS = {
  high: {
    videoCodec: 'mpeg4',
    audioCodec: 'libmp3lame',
    audioBitrate: '192k',
    qscale: 2,
    description: 'High quality AVI - qscale 2 (VBR)'
  },
  medium: {
    videoCodec: 'mpeg4',
    audioCodec: 'libmp3lame',
    audioBitrate: '128k',
    qscale: 5,
    description: 'Balanced AVI - qscale 5 (VBR)'
  },
  low: {
    videoCodec: 'mpeg4',
    audioCodec: 'libmp3lame',
    audioBitrate: '96k',
    qscale: 10,
    description: 'Lower quality AVI - qscale 10 (VBR)'
  }
};

/**
 * FLV conversion presets
 * Using H.264 video with AAC audio and CRF for Flash Video
 * Optimized for faster encoding speeds to handle 4K conversions
 */
export const FLV_CONVERSION_PRESETS = {
  high: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '192k',
    preset: 'faster', // Changed from 'slow' to 'faster' for speed
    crf: 20, // Adjusted CRF for faster preset
    profile: 'main',
    level: '3.1',
    description: 'High quality FLV - CRF 20, faster preset'
  },
  medium: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '128k',
    preset: 'faster', // Changed from 'medium' to 'faster'
    crf: 23,
    profile: 'main',
    level: '3.0',
    description: 'Balanced FLV - CRF 23, faster preset'
  },
  low: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '96k',
    preset: 'veryfast', // Changed from 'fast' to 'veryfast'
    crf: 28,
    profile: 'baseline',
    level: '3.0',
    description: 'Lower quality FLV - CRF 28, veryfast preset'
  }
};

/**
 * 3GP conversion presets
 * Using H.264 video with AAC audio optimized for mobile devices
 */
export const THREE_GP_CONVERSION_PRESETS = {
  high: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '128k',
    preset: 'slow',
    crf: 23,
    profile: 'baseline',
    level: '3.0',
    maxWidth: 640,
    maxHeight: 480,
    description: 'High quality 3GP - CRF 23, 640x480 max'
  },
  medium: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '96k',
    preset: 'medium',
    crf: 26,
    profile: 'baseline',
    level: '3.0',
    maxWidth: 480,
    maxHeight: 360,
    description: 'Balanced 3GP - CRF 26, 480x360 max'
  },
  low: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '64k',
    preset: 'fast',
    crf: 30,
    profile: 'baseline',
    level: '3.0',
    maxWidth: 320,
    maxHeight: 240,
    description: 'Lower quality 3GP - CRF 30, 320x240 max'
  }
};

/**
 * 3G2 conversion presets
 * Using H.264 video with AAC audio optimized for CDMA mobile devices
 */
export const THREE_G2_CONVERSION_PRESETS = {
  high: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '128k',
    preset: 'slow',
    crf: 23,
    profile: 'baseline',
    level: '3.0',
    maxWidth: 640,
    maxHeight: 480,
    description: 'High quality 3G2 - CRF 23, 640x480 max'
  },
  medium: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '96k',
    preset: 'medium',
    crf: 26,
    profile: 'baseline',
    level: '3.0',
    maxWidth: 480,
    maxHeight: 360,
    description: 'Balanced 3G2 - CRF 26, 480x360 max'
  },
  low: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '64k',
    preset: 'fast',
    crf: 30,
    profile: 'baseline',
    level: '3.0',
    maxWidth: 320,
    maxHeight: 240,
    description: 'Lower quality 3G2 - CRF 30, 320x240 max'
  }
};

/**
 * Check if video resolution exceeds maximum and needs downscaling
 * @param {object} metadata - Video metadata from ffprobe
 * @returns {object} - { needsDownscaling: boolean, currentWidth, currentHeight, targetWidth, targetHeight }
 */
export const checkResolutionDownscaling = (metadata) => {
  if (!metadata || !metadata.streams) {
    return { needsDownscaling: false };
  }

  // Find video stream
  const videoStream = metadata.streams.find(s => s.codec_type === 'video');
  if (!videoStream) {
    return { needsDownscaling: false };
  }

  const currentWidth = videoStream.width;
  const currentHeight = videoStream.height;
  const maxWidth = FFMPEG_CONFIG.maxResolution.width;
  const maxHeight = FFMPEG_CONFIG.maxResolution.height;
  const enabled = FFMPEG_CONFIG.maxResolution.enabled;

  // Check if downscaling is needed
  if (enabled && (currentWidth > maxWidth || currentHeight > maxHeight)) {
    // Calculate target dimensions maintaining aspect ratio
    const aspectRatio = currentWidth / currentHeight;
    let targetWidth, targetHeight;

    if (currentWidth > maxWidth) {
      targetWidth = maxWidth;
      targetHeight = Math.round(maxWidth / aspectRatio);
    } else {
      targetHeight = maxHeight;
      targetWidth = Math.round(maxHeight * aspectRatio);
    }

    // Ensure dimensions are even (required by most codecs)
    targetWidth = Math.round(targetWidth / 2) * 2;
    targetHeight = Math.round(targetHeight / 2) * 2;

    return {
      needsDownscaling: true,
      currentWidth,
      currentHeight,
      targetWidth,
      targetHeight,
      aspectRatio
    };
  }

  return {
    needsDownscaling: false,
    currentWidth,
    currentHeight
  };
};

/**
 * Build scale filter for FFmpeg based on resolution check
 * @param {object} resolutionInfo - Result from checkResolutionDownscaling
 * @returns {string|null} - Scale filter string or null if no scaling needed
 */
export const buildScaleFilter = (resolutionInfo) => {
  if (!resolutionInfo.needsDownscaling) {
    return null;
  }

  const { targetWidth, targetHeight } = resolutionInfo;
  return `scale=${targetWidth}:${targetHeight}`;
};

export default {
  SUPPORTED_FORMATS,
  CONVERSION_PRESETS,
  WEBM_CONVERSION_PRESETS,
  MOV_CONVERSION_PRESETS,
  MPEG_CONVERSION_PRESETS,
  WMV_CONVERSION_PRESETS,
  MKV_CONVERSION_PRESETS,
  AVI_CONVERSION_PRESETS,
  FLV_CONVERSION_PRESETS,
  THREE_GP_CONVERSION_PRESETS,
  THREE_G2_CONVERSION_PRESETS,
  FFMPEG_CONFIG,
  PATHS,
  getAllSupportedExtensions,
  getAllSupportedMimeTypes,
  isSupportedExtension,
  isSupportedMimeType,
  getFormatByExtension,
  checkResolutionDownscaling,
  buildScaleFilter
};
