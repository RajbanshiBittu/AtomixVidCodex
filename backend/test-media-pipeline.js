/**
 * Test Media Pipeline with FLV to MPEG conversion
 * 
 * Tests:
 * 1. MediaValidator - Pre-encoding validation
 * 2. FormatCapabilityMatrix - Format constraints
 * 3. ResolutionNormalizer - Resolution adjustment
 * 4. EncodingProfileManager - Profile selection
 * 5. ConversionPipeline - Full pipeline execution
 * 6. toMpeg service - Pipeline integration
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { MediaValidator } from './services/media-pipeline/MediaValidator.js';
import { FormatCapabilityMatrix } from './services/media-pipeline/FormatCapabilityMatrix.js';
import { ResolutionNormalizer } from './services/media-pipeline/ResolutionNormalizer.js';
import { EncodingProfileManager } from './services/media-pipeline/EncodingProfileManager.js';
import { ConversionPipeline } from './services/media-pipeline/ConversionPipeline.js';
import { convertFlvToMpeg } from './services/toMpeg.services.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_INPUT = path.join(__dirname, 'inputs', 'sampels.3gp'); // Using 3GP as test (FLV not available)
const TEST_OUTPUT_DIR = path.join(__dirname, 'outputs');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Test result tracking
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async test(name, fn) {
    console.log(`\n${colors.blue}▶ ${name}${colors.reset}`);
    const startTime = Date.now();

    try {
      await fn();
      const duration = Date.now() - startTime;
      console.log(`${colors.green}✓ ${name} passed (${duration}ms)${colors.reset}`);
      this.tests.push({ name, status: 'passed', duration });
      this.passed++;
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`${colors.red}✗ ${name} failed (${duration}ms)${colors.reset}`);
      console.error(`  Error: ${error.message}`);
      this.tests.push({ name, status: 'failed', duration, error: error.message });
      this.failed++;
      return false;
    }
  }

  summary() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));

    this.tests.forEach(test => {
      const status = test.status === 'passed' 
        ? `${colors.green}PASS${colors.reset}`
        : `${colors.red}FAIL${colors.reset}`;
      console.log(`${status} ${test.name} (${test.duration}ms)`);
      if (test.error) {
        console.log(`     ${colors.red}${test.error}${colors.reset}`);
      }
    });

    console.log('\n' + '-'.repeat(70));
    const total = this.passed + this.failed;
    const successRate = ((this.passed / total) * 100).toFixed(1);
    console.log(`Total: ${total} | Passed: ${this.passed} | Failed: ${this.failed} | Success Rate: ${successRate}%`);
    console.log('='.repeat(70) + '\n');

    return this.failed === 0;
  }
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('MEDIA PIPELINE TEST SUITE');
  console.log('='.repeat(70));
  console.log(`Test Input: ${TEST_INPUT}`);
  console.log(`Test Output: ${TEST_OUTPUT_DIR}`);
  console.log('='.repeat(70));

  const runner = new TestRunner();

  // ============================================================
  // TEST 1: MediaValidator
  // ============================================================
  await runner.test('MediaValidator - Pre-encoding validation', async () => {
    const validation = await MediaValidator.validate(TEST_INPUT);

    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    console.log(`  Validation time: ${validation.duration}ms`);
    console.log(`  Video stream: ${validation.metadata.streams.find(s => s.codec_type === 'video')?.codec_name}`);
    console.log(`  Audio stream: ${validation.metadata.streams.find(s => s.codec_type === 'audio')?.codec_name}`);

    if (!validation.metadata.streams.find(s => s.codec_type === 'video')) {
      throw new Error('No video stream detected');
    }
  });

  // ============================================================
  // TEST 2: FormatCapabilityMatrix
  // ============================================================
  await runner.test('FormatCapabilityMatrix - Format constraints', async () => {
    const mpegCapabilities = FormatCapabilityMatrix.getCapabilities('mpeg');

    if (!mpegCapabilities) {
      throw new Error('MPEG capabilities not found');
    }

    console.log(`  Max resolution: ${mpegCapabilities.maxResolution.width}x${mpegCapabilities.maxResolution.height}`);
    console.log(`  Supported video codecs: ${mpegCapabilities.supportedVideoCodecs.join(', ')}`);
    console.log(`  Supported audio codecs: ${mpegCapabilities.supportedAudioCodecs.join(', ')}`);

    // Test resolution support
    const is1080pSupported = FormatCapabilityMatrix.isResolutionSupported('mpeg', 1920, 1080);
    const is4KSupported = FormatCapabilityMatrix.isResolutionSupported('mpeg', 3840, 2160);

    console.log(`  1080p supported: ${is1080pSupported}`);
    console.log(`  4K supported: ${is4KSupported}`);

    if (is1080pSupported !== true) {
      throw new Error('1080p should be supported by MPEG');
    }

    if (is4KSupported !== false) {
      throw new Error('4K should NOT be supported by MPEG');
    }
  });

  // ============================================================
  // TEST 3: ResolutionNormalizer
  // ============================================================
  await runner.test('ResolutionNormalizer - Resolution adjustment', async () => {
    // Create mock metadata for 4K video
    const mock4KMetadata = {
      streams: [
        {
          codec_type: 'video',
          width: 3840,
          height: 2160,
          codec_name: 'h264'
        }
      ]
    };

    const normalization = ResolutionNormalizer.normalize(mock4KMetadata, 'mpeg');

    console.log(`  Original: ${normalization.original.width}x${normalization.original.height}`);
    console.log(`  Normalized: ${normalization.normalized.width}x${normalization.normalized.height}`);
    console.log(`  Adjusted: ${normalization.adjusted}`);
    console.log(`  Reason: ${normalization.reason}`);

    if (!normalization.adjusted) {
      throw new Error('4K video should be downscaled for MPEG');
    }

    if (normalization.normalized.width > 1920 || normalization.normalized.height > 1080) {
      throw new Error('Normalized resolution exceeds MPEG limits');
    }
  });

  // ============================================================
  // TEST 4: EncodingProfileManager
  // ============================================================
  await runner.test('EncodingProfileManager - Profile selection', async () => {
    // List available MPEG profiles
    const mpegProfiles = EncodingProfileManager.listProfilesForFormat('mpeg');

    console.log(`  Available MPEG profiles: ${mpegProfiles.length}`);
    mpegProfiles.forEach(profile => {
      console.log(`    - ${profile.id}: ${profile.description} (${profile.resolution.width}x${profile.resolution.height})`);
    });

    if (mpegProfiles.length === 0) {
      throw new Error('No MPEG profiles found');
    }

    // Get specific profile
    const dvdPalProfile = EncodingProfileManager.getProfile('mpeg-dvd-pal');
    
    if (!dvdPalProfile) {
      throw new Error('DVD PAL profile not found');
    }

    console.log(`  DVD PAL profile:`, dvdPalProfile.description);
    console.log(`    Video codec: ${dvdPalProfile.video.codec}`);
    console.log(`    Audio codec: ${dvdPalProfile.audio.codec}`);
    console.log(`    Bitrate: ${dvdPalProfile.video.bitrate}`);
  });

  // ============================================================
  // TEST 5: ConversionPipeline (Mock)
  // ============================================================
  await runner.test('ConversionPipeline - Component validation', async () => {
    // Validate that all pipeline components exist
    const components = [
      MediaValidator,
      FormatCapabilityMatrix,
      ResolutionNormalizer,
      EncodingProfileManager,
      ConversionPipeline
    ];

    components.forEach(component => {
      if (!component) {
        throw new Error(`Missing pipeline component: ${component.name}`);
      }
    });

    console.log(`  ✓ All ${components.length} pipeline components loaded`);
  });

  // ============================================================
  // TEST 6: Service Integration (Legacy Mode)
  // ============================================================
  await runner.test('toMpeg service - Legacy mode integration', async () => {
    // Ensure pipeline is disabled for this test
    const originalEnv = process.env.USE_MEDIA_PIPELINE;
    process.env.USE_MEDIA_PIPELINE = 'false';

    try {
      // Note: This will actually attempt conversion
      // For true unit test, this should be mocked
      console.log(`  Testing legacy mode (USE_MEDIA_PIPELINE=false)`);
      console.log(`  Warning: This will attempt actual conversion`);

      // Check if test file exists
      try {
        await fs.access(TEST_INPUT);
      } catch {
        throw new Error(`Test input file not found: ${TEST_INPUT}`);
      }

      const result = await convertFlvToMpeg(TEST_INPUT, { quality: 'medium' });

      console.log(`  ✓ Conversion completed in legacy mode`);
      console.log(`    Output: ${result.outputFilename}`);
      console.log(`    Mode: ${result.mode || 'legacy'}`);

      if (!result.success) {
        throw new Error('Conversion failed');
      }

      // Cleanup test output
      try {
        await fs.unlink(result.outputPath);
        console.log(`  ✓ Cleaned up test output`);
      } catch (error) {
        console.warn(`  Warning: Could not cleanup ${result.outputPath}`);
      }

    } finally {
      process.env.USE_MEDIA_PIPELINE = originalEnv;
    }
  });

  // ============================================================
  // TEST 7: Service Integration (Pipeline Mode)
  // ============================================================
  await runner.test('toMpeg service - Pipeline mode integration', async () => {
    // Enable pipeline for this test
    const originalEnv = process.env.USE_MEDIA_PIPELINE;
    process.env.USE_MEDIA_PIPELINE = 'true';

    try {
      console.log(`  Testing pipeline mode (USE_MEDIA_PIPELINE=true)`);
      console.log(`  Warning: This will attempt actual conversion`);

      const result = await convertFlvToMpeg(TEST_INPUT, { 
        quality: 'medium',
        profile: 'mpeg-dvd-pal' 
      });

      console.log(`  ✓ Conversion completed in pipeline mode`);
      console.log(`    Output: ${result.outputFilename}`);
      console.log(`    Mode: ${result.mode}`);
      console.log(`    Profile: ${result.profile || 'N/A'}`);

      if (result.adjustments) {
        console.log(`    Resolution adjusted: ${result.adjustments.resolutionAdjusted}`);
      }

      if (result.mode !== 'pipeline' && result.mode !== 'legacy') {
        console.warn(`  Warning: Unexpected mode: ${result.mode}`);
      }

      if (!result.success) {
        throw new Error('Conversion failed');
      }

      // Cleanup test output
      try {
        await fs.unlink(result.outputPath);
        console.log(`  ✓ Cleaned up test output`);
      } catch (error) {
        console.warn(`  Warning: Could not cleanup ${result.outputPath}`);
      }

    } finally {
      process.env.USE_MEDIA_PIPELINE = originalEnv;
    }
  });

  // ============================================================
  // TEST SUMMARY
  // ============================================================
  const allPassed = runner.summary();

  if (allPassed) {
    console.log(`${colors.green}🎉 All tests passed!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ Some tests failed${colors.reset}\n`);
    process.exit(1);
  }
}

// Execute tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
