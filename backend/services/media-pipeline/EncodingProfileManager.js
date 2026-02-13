/**
 * EncodingProfileManager - Standard encoding profiles
 * 
 * Manages industry-standard encoding profiles for various use cases.
 * Based on: DVB, ATSC, DVD Forum, Blu-ray, YouTube, Vimeo standards.
 * 
 * Industry Standard: EBU R 128 (Loudness normalization), ITU-R BT.709
 */

import { FormatCapabilityMatrix } from './FormatCapabilityMatrix.js';

export class EncodingProfileManager {
  /**
   * Get all encoding profiles
   */
  static getProfiles() {
    return {
      // MPEG-2 Profiles
      'mpeg-dvd-pal': {
        format: 'mpeg',
        description: 'DVD Video PAL Standard',
        video: {
          codec: 'mpeg2video',
          resolution: { width: 720, height: 576 },
          bitrate: '6000k',
          maxrate: '8000k',
          bufsize: '1835k',
          gopSize: 12,
          frameRate: 25,
          pixelFormat: 'yuv420p',
          aspectRatio: '16:9'
        },
        audio: {
          codec: 'mp2',
          bitrate: '384k',
          sampleRate: 48000,
          channels: 2
        },
        container: 'mpeg'
      },

      'mpeg-dvd-ntsc': {
        format: 'mpeg',
        description: 'DVD Video NTSC Standard',
        video: {
          codec: 'mpeg2video',
          resolution: { width: 720, height: 480 },
          bitrate: '6000k',
          maxrate: '8000k',
          bufsize: '1835k',
          gopSize: 12,
          frameRate: 29.97,
          pixelFormat: 'yuv420p',
          aspectRatio: '16:9'
        },
        audio: {
          codec: 'mp2',
          bitrate: '384k',
          sampleRate: 48000,
          channels: 2
        },
        container: 'mpeg'
      },

      'mpeg-broadcast-sd': {
        format: 'mpeg',
        description: 'Broadcast SD (DVB/ATSC)',
        video: {
          codec: 'mpeg2video',
          resolution: { width: 720, height: 576 },
          bitrate: '5000k',
          maxrate: '7000k',
          bufsize: '2048k',
          gopSize: 12,
          frameRate: 25,
          pixelFormat: 'yuv420p',
          aspectRatio: '16:9'
        },
        audio: {
          codec: 'mp2',
          bitrate: '256k',
          sampleRate: 48000,
          channels: 2
        },
        container: 'mpeg'
      },

      'mpeg-broadcast-hd': {
        format: 'mpeg',
        description: 'Broadcast HD 1080i (DVB/ATSC)',
        video: {
          codec: 'mpeg2video',
          resolution: { width: 1920, height: 1080 },
          bitrate: '9800k',
          maxrate: '15000k',
          bufsize: '4096k',
          gopSize: 15,
          frameRate: 25,
          pixelFormat: 'yuv420p',
          aspectRatio: '16:9',
          interlaced: true
        },
        audio: {
          codec: 'ac3',
          bitrate: '448k',
          sampleRate: 48000,
          channels: 2
        },
        container: 'mpeg'
      },

      'mpeg-hd-720p': {
        format: 'mpeg',
        description: 'HD 720p Progressive',
        video: {
          codec: 'mpeg2video',
          resolution: { width: 1280, height: 720 },
          bitrate: '6000k',
          maxrate: '8000k',
          bufsize: '2048k',
          gopSize: 15,
          frameRate: 25,
          pixelFormat: 'yuv420p',
          aspectRatio: '16:9'
        },
        audio: {
          codec: 'mp2',
          bitrate: '256k',
          sampleRate: 48000,
          channels: 2
        },
        container: 'mpeg'
      },

      'mpeg-hd-1080p': {
        format: 'mpeg',
        description: 'Full HD 1080p Progressive',
        video: {
          codec: 'mpeg2video',
          resolution: { width: 1920, height: 1080 },
          bitrate: '9000k',
          maxrate: '12000k',
          bufsize: '4096k',
          gopSize: 15,
          frameRate: 25,
          pixelFormat: 'yuv420p',
          aspectRatio: '16:9'
        },
        audio: {
          codec: 'ac3',
          bitrate: '384k',
          sampleRate: 48000,
          channels: 2
        },
        container: 'mpeg'
      },

      // Web/Streaming Profiles
      'web-360p': {
        format: 'mp4',
        description: 'Web 360p',
        video: {
          codec: 'h264',
          resolution: { width: 640, height: 360 },
          crf: 28,
          preset: 'faster',
          profile: 'baseline',
          level: '3.0'
        },
        audio: {
          codec: 'aac',
          bitrate: '96k',
          sampleRate: 44100
        }
      },

      'web-720p': {
        format: 'mp4',
        description: 'Web 720p HD',
        video: {
          codec: 'h264',
          resolution: { width: 1280, height: 720 },
          crf: 23,
          preset: 'medium',
          profile: 'high',
          level: '4.0'
        },
        audio: {
          codec: 'aac',
          bitrate: '128k',
          sampleRate: 48000
        }
      },

      'web-1080p': {
        format: 'mp4',
        description: 'Web 1080p Full HD',
        video: {
          codec: 'h264',
          resolution: { width: 1920, height: 1080 },
          crf: 20,
          preset: 'medium',
          profile: 'high',
          level: '4.1'
        },
        audio: {
          codec: 'aac',
          bitrate: '192k',
          sampleRate: 48000
        }
      }
    };
  }

  /**
   * Select appropriate profile based on input and target format
   */
  static selectProfile(metadata, targetFormat, userPreference = null) {
    const profiles = this.getProfiles();

    // If user specified a profile, use it
    if (userPreference && profiles[userPreference]) {
      return { profileId: userPreference, ...profiles[userPreference] };
    }

    // Auto-select based on format and resolution
    const videoStream = metadata.streams?.find(s => s.codec_type === 'video');
    
    if (!videoStream) {
      throw new Error('No video stream found for profile selection');
    }

    const sourceWidth = videoStream.width;
    const sourceHeight = videoStream.height;
    const sourcePixels = sourceWidth * sourceHeight;

    // MPEG-specific profile selection
    if (targetFormat === 'mpeg') {
      // HD content (>= 720p)
      if (sourcePixels >= 1280 * 720) {
        if (sourceHeight >= 1080) {
          return { profileId: 'mpeg-hd-1080p', ...profiles['mpeg-hd-1080p'] };
        } else {
          return { profileId: 'mpeg-hd-720p', ...profiles['mpeg-hd-720p'] };
        }
      }
      
      // SD content
      // Detect PAL vs NTSC based on frame rate
      const frameRate = this.getFrameRate(videoStream);
      
      if (frameRate > 26 && frameRate < 32) {
        // NTSC (29.97 or 30 fps)
        return { profileId: 'mpeg-dvd-ntsc', ...profiles['mpeg-dvd-ntsc'] };
      } else {
        // PAL (25 fps) or unknown - default to PAL
        return { profileId: 'mpeg-dvd-pal', ...profiles['mpeg-dvd-pal'] };
      }
    }

    // For other formats, return a generic profile
    return null;
  }

  /**
   * Get frame rate from video stream
   */
  static getFrameRate(videoStream) {
    if (videoStream.r_frame_rate) {
      const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
      return num / den;
    }
    
    if (videoStream.avg_frame_rate) {
      const [num, den] = videoStream.avg_frame_rate.split('/').map(Number);
      return num / den;
    }

    return 25; // Default PAL
  }

  /**
   * Build FFmpeg arguments from profile
   */
  static buildFFmpegArgsFromProfile(profile, inputPath, outputPath, resolutionOverride = null) {
    const args = ['-i', inputPath];

    // Video codec
    args.push('-c:v', profile.video.codec);

    // Resolution (use override if provided)
    const targetRes = resolutionOverride || profile.video.resolution;
    if (targetRes) {
      args.push('-vf', `scale=${targetRes.width}:${targetRes.height}`);
    }

    // Video encoding parameters
    if (profile.video.bitrate) {
      args.push('-b:v', profile.video.bitrate);
    }

    if (profile.video.maxrate) {
      args.push('-maxrate', profile.video.maxrate);
    }

    if (profile.video.bufsize) {
      args.push('-bufsize', profile.video.bufsize);
    }

    if (profile.video.crf !== undefined) {
      args.push('-crf', profile.video.crf.toString());
    }

    if (profile.video.preset) {
      args.push('-preset', profile.video.preset);
    }

    if (profile.video.profile) {
      args.push('-profile:v', profile.video.profile);
    }

    if (profile.video.level) {
      args.push('-level', profile.video.level);
    }

    if (profile.video.gopSize) {
      args.push('-g', profile.video.gopSize.toString());
    }

    if (profile.video.frameRate) {
      args.push('-r', profile.video.frameRate.toString());
    }

    if (profile.video.pixelFormat) {
      args.push('-pix_fmt', profile.video.pixelFormat);
    }

    // Audio codec
    args.push('-c:a', profile.audio.codec);

    if (profile.audio.bitrate) {
      args.push('-b:a', profile.audio.bitrate);
    }

    if (profile.audio.sampleRate) {
      args.push('-ar', profile.audio.sampleRate.toString());
    }

    if (profile.audio.channels) {
      args.push('-ac', profile.audio.channels.toString());
    }

    // Container format
    if (profile.container) {
      args.push('-f', profile.container);
    }

    // Additional settings
    args.push('-map_metadata', '0');
    args.push('-max_muxing_queue_size', '1024');
    args.push('-y');

    args.push(outputPath);

    return args;
  }

  /**
   * Get profile by ID
   */
  static getProfile(profileId) {
    const profiles = this.getProfiles();
    return profiles[profileId] || null;
  }

  /**
   * List available profiles for format
   */
  static listProfilesForFormat(targetFormat) {
    const profiles = this.getProfiles();
    const formatProfiles = [];

    for (const [id, profile] of Object.entries(profiles)) {
      if (profile.format === targetFormat) {
        formatProfiles.push({
          id,
          description: profile.description,
          resolution: profile.video.resolution
        });
      }
    }

    return formatProfiles;
  }
}

export default EncodingProfileManager;
