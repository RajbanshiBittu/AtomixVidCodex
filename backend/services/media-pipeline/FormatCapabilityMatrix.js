/**
 * FormatCapabilityMatrix - Format and codec constraint definitions
 * 
 * Defines technical capabilities and limitations for each output format.
 * Based on industry standards: ITU-T, SMPTE, DVD Forum, Blu-ray Association.
 * 
 * Industry Standard: Broadcast & Media Exchange Format (MXF) constraint modeling
 */

export class FormatCapabilityMatrix {
  /**
   * Get format capabilities and constraints
   */
  static getCapabilities() {
    return {
      // MPEG-2 (DVD, Broadcast)
      mpeg: {
        maxResolution: { width: 1920, height: 1080 },
        minResolution: { width: 352, height: 240 },
        supportedVideoCodecs: ['mpeg2video'],
        supportedAudioCodecs: ['mp2', 'mp3', 'ac3'],
        maxBitrate: { video: 9800, audio: 448 }, // kbps
        supportedFrameRates: [23.976, 24, 25, 29.97, 30, 50, 59.94, 60],
        gopStructure: { min: 12, max: 15 }, // GOP size
        pixelFormats: ['yuv420p', 'yuv422p'],
        aspectRatios: ['4:3', '16:9'],
        profiles: {
          dvd: {
            maxResolution: { width: 720, height: 576 }, // PAL
            maxBitrate: { video: 8000, audio: 384 },
            frameRate: 25
          },
          broadcast: {
            maxResolution: { width: 1920, height: 1080 },
            maxBitrate: { video: 9800, audio: 448 },
            frameRate: 25
          },
          hd: {
            maxResolution: { width: 1920, height: 1080 },
            maxBitrate: { video: 9800, audio: 448 },
            frameRate: 30
          }
        }
      },

      // H.264/MP4 (Universal)
      mp4: {
        maxResolution: { width: 7680, height: 4320 }, // 8K
        minResolution: { width: 128, height: 96 },
        supportedVideoCodecs: ['h264', 'hevc'],
        supportedAudioCodecs: ['aac', 'mp3', 'ac3'],
        maxBitrate: { video: 100000, audio: 640 },
        supportedFrameRates: 'any',
        gopStructure: { min: 24, max: 300 },
        pixelFormats: ['yuv420p', 'yuv422p', 'yuv444p'],
        aspectRatios: 'any'
      },

      // WebM (Web streaming)
      webm: {
        maxResolution: { width: 7680, height: 4320 },
        minResolution: { width: 128, height: 96 },
        supportedVideoCodecs: ['vp8', 'vp9', 'av1'],
        supportedAudioCodecs: ['opus', 'vorbis'],
        maxBitrate: { video: 50000, audio: 510 },
        supportedFrameRates: 'any',
        gopStructure: { min: 60, max: 300 },
        pixelFormats: ['yuv420p'],
        aspectRatios: 'any'
      },

      // WMV (Windows Media)
      wmv: {
        maxResolution: { width: 1920, height: 1080 },
        minResolution: { width: 176, height: 144 },
        supportedVideoCodecs: ['wmv2', 'wmv3'],
        supportedAudioCodecs: ['wmav2'],
        maxBitrate: { video: 10000, audio: 384 },
        supportedFrameRates: [15, 23.976, 24, 25, 29.97, 30],
        gopStructure: { min: 50, max: 250 },
        pixelFormats: ['yuv420p'],
        aspectRatios: ['4:3', '16:9']
      },

      // FLV (Flash)
      flv: {
        maxResolution: { width: 1920, height: 1080 },
        minResolution: { width: 176, height: 144 },
        supportedVideoCodecs: ['h264', 'flv1'],
        supportedAudioCodecs: ['aac', 'mp3'],
        maxBitrate: { video: 5000, audio: 320 },
        supportedFrameRates: [15, 24, 25, 30],
        gopStructure: { min: 24, max: 120 },
        pixelFormats: ['yuv420p'],
        aspectRatios: ['4:3', '16:9']
      },

      // MOV (QuickTime)
      mov: {
        maxResolution: { width: 7680, height: 4320 },
        minResolution: { width: 128, height: 96 },
        supportedVideoCodecs: ['h264', 'hevc', 'prores'],
        supportedAudioCodecs: ['aac', 'pcm_s16le', 'pcm_s24le'],
        maxBitrate: { video: 100000, audio: 1536 },
        supportedFrameRates: 'any',
        gopStructure: { min: 24, max: 300 },
        pixelFormats: ['yuv420p', 'yuv422p', 'yuv444p'],
        aspectRatios: 'any'
      },

      // MKV (Matroska)
      mkv: {
        maxResolution: { width: 7680, height: 4320 },
        minResolution: { width: 128, height: 96 },
        supportedVideoCodecs: ['h264', 'hevc', 'vp9', 'av1'],
        supportedAudioCodecs: ['aac', 'opus', 'vorbis', 'ac3', 'dts'],
        maxBitrate: { video: 100000, audio: 1536 },
        supportedFrameRates: 'any',
        gopStructure: { min: 24, max: 300 },
        pixelFormats: ['yuv420p', 'yuv422p', 'yuv444p'],
        aspectRatios: 'any'
      },

      // AVI (legacy)
      avi: {
        maxResolution: { width: 1920, height: 1080 },
        minResolution: { width: 176, height: 144 },
        supportedVideoCodecs: ['mpeg4', 'xvid', 'mjpeg'],
        supportedAudioCodecs: ['mp3', 'ac3', 'pcm_s16le'],
        maxBitrate: { video: 8000, audio: 384 },
        supportedFrameRates: [15, 23.976, 24, 25, 29.97, 30],
        gopStructure: { min: 24, max: 300 },
        pixelFormats: ['yuv420p', 'yuv422p'],
        aspectRatios: ['4:3', '16:9']
      }
    };
  }

  /**
   * Check if resolution is supported for target format
   */
  static isResolutionSupported(width, height, targetFormat) {
    const capabilities = this.getCapabilities();
    const formatCaps = capabilities[targetFormat];

    if (!formatCaps) {
      return { supported: false, reason: 'Unknown format' };
    }

    const { maxResolution, minResolution } = formatCaps;

    if (width > maxResolution.width || height > maxResolution.height) {
      return {
        supported: false,
        reason: `Resolution ${width}x${height} exceeds ${targetFormat.toUpperCase()} maximum ${maxResolution.width}x${maxResolution.height}`,
        maxResolution
      };
    }

    if (width < minResolution.width || height < minResolution.height) {
      return {
        supported: false,
        reason: `Resolution ${width}x${height} below ${targetFormat.toUpperCase()} minimum ${minResolution.width}x${minResolution.height}`,
        minResolution
      };
    }

    return { supported: true };
  }

  /**
   * Get recommended profile for format and use case
   */
  static getRecommendedProfile(targetFormat, useCase = 'general') {
    const capabilities = this.getCapabilities();
    const formatCaps = capabilities[targetFormat];

    if (!formatCaps) {
      return null;
    }

    // MPEG-2 specific profiles
    if (targetFormat === 'mpeg') {
      const profiles = formatCaps.profiles;
      
      switch (useCase) {
        case 'dvd':
          return profiles.dvd;
        case 'broadcast':
        case 'tv':
          return profiles.broadcast;
        case 'hd':
        case 'general':
        default:
          return profiles.hd;
      }
    }

    // For other formats, return base capabilities
    return {
      maxResolution: formatCaps.maxResolution,
      maxBitrate: formatCaps.maxBitrate,
      frameRate: Array.isArray(formatCaps.supportedFrameRates) 
        ? formatCaps.supportedFrameRates[formatCaps.supportedFrameRates.length - 1]
        : 30
    };
  }

  /**
   * Get safe fallback resolution for format
   */
  static getSafeFallbackResolution(targetFormat, sourceWidth, sourceHeight) {
    const capabilities = this.getCapabilities();
    const formatCaps = capabilities[targetFormat];

    if (!formatCaps) {
      return { width: 1280, height: 720 }; // Default 720p
    }

    const { maxResolution } = formatCaps;
    const sourceAspectRatio = sourceWidth / sourceHeight;

    // If source fits within max, use source resolution
    if (sourceWidth <= maxResolution.width && sourceHeight <= maxResolution.height) {
      return {
        width: Math.round(sourceWidth / 2) * 2,
        height: Math.round(sourceHeight / 2) * 2
      };
    }

    // Calculate target maintaining aspect ratio
    let targetWidth, targetHeight;

    if (sourceWidth > maxResolution.width) {
      targetWidth = maxResolution.width;
      targetHeight = Math.round(targetWidth / sourceAspectRatio);
    } else {
      targetHeight = maxResolution.height;
      targetWidth = Math.round(targetHeight * sourceAspectRatio);
    }

    // Ensure even dimensions
    targetWidth = Math.round(targetWidth / 2) * 2;
    targetHeight = Math.round(targetHeight / 2) * 2;

    // Ensure within bounds
    if (targetHeight > maxResolution.height) {
      targetHeight = maxResolution.height;
      targetWidth = Math.round(targetHeight * sourceAspectRatio / 2) * 2;
    }

    return { width: targetWidth, height: targetHeight };
  }

  /**
   * Get format-specific encoding constraints
   */
  static getEncodingConstraints(targetFormat) {
    const capabilities = this.getCapabilities();
    return capabilities[targetFormat] || null;
  }
}

export default FormatCapabilityMatrix;
