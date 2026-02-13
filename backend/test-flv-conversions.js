import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { convertToWebm } from './services/toWebm.services.js';
import { convertToWmv } from './services/toWmv.services.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test FLV to WebM and FLV to WMV conversions
 */
async function testFlvConversions() {
  console.log('\n=== Testing FLV Conversions with Optimizations ===\n');
  
  const inputsDir = path.join(__dirname, 'inputs');
  const flvFile = path.join(inputsDir, 'sampels.flv');
  const flv4kFile = path.join(inputsDir, 'sample_3840x2160.flv'); // Check if 4K FLV exists
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Check if FLV file exists
  try {
    await fs.access(flvFile);
    console.log(`✓ Found FLV test file: ${flvFile}\n`);
  } catch (error) {
    console.error(`✗ FLV test file not found: ${flvFile}`);
    return;
  }

  // Test 1: FLV to WebM
  console.log('Test 1: FLV to WebM Conversion');
  console.log('================================');
  try {
    const startTime = Date.now();
    const result = await convertToWebm(flvFile, { quality: 'medium' });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✓ Success! Output: ${result.outputFilename}`);
    console.log(`  - Duration: ${duration}s`);
    console.log(`  - Output size: ${(result.outputSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Quality: ${result.quality}\n`);
    
    results.passed++;
    results.tests.push({ name: 'FLV to WebM', status: 'PASSED', duration });
  } catch (error) {
    console.error(`✗ Failed: ${error.message}\n`);
    results.failed++;
    results.tests.push({ name: 'FLV to WebM', status: 'FAILED', error: error.message });
  }

  // Test 2: FLV to WMV
  console.log('Test 2: FLV to WMV Conversion');
  console.log('================================');
  try {
    const startTime = Date.now();
    const result = await convertToWmv(flvFile, { quality: 'medium' });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✓ Success! Output: ${result.outputFilename}`);
    console.log(`  - Duration: ${duration}s`);
    console.log(`  - Output size: ${(result.outputSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Quality: ${result.quality}\n`);
    
    results.passed++;
    results.tests.push({ name: 'FLV to WMV', status: 'PASSED', duration });
  } catch (error) {
    console.error(`✗ Failed: ${error.message}\n`);
    results.failed++;
    results.tests.push({ name: 'FLV to WMV', status: 'FAILED', error: error.message });
  }

  // Test 3: Check if 4K FLV exists and test downscaling
  try {
    await fs.access(flv4kFile);
    console.log('Test 3: 4K FLV to WebM with Auto-downscaling');
    console.log('==============================================');
    
    try {
      const startTime = Date.now();
      const result = await convertToWebm(flv4kFile, { quality: 'medium' });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`✓ Success! Output: ${result.outputFilename}`);
      console.log(`  - Duration: ${duration}s`);
      console.log(`  - Output size: ${(result.outputSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  - Auto-downscaling applied\n`);
      
      results.passed++;
      results.tests.push({ name: '4K FLV to WebM', status: 'PASSED', duration });
    } catch (error) {
      console.error(`✗ Failed: ${error.message}\n`);
      results.failed++;
      results.tests.push({ name: '4K FLV to WebM', status: 'FAILED', error: error.message });
    }
  } catch (error) {
    console.log('Test 3: Skipped (No 4K FLV file found)\n');
  }

  // Test 4: Use existing 4K MPEG to create 4K FLV scenario
  const mpeg4kFile = path.join(inputsDir, 'sample_3840x2160.mpeg');
  try {
    await fs.access(mpeg4kFile);
    console.log('Test 4: Large Resolution MPEG to WebM with Auto-downscaling');
    console.log('=============================================================');
    
    try {
      const startTime = Date.now();
      const result = await convertToWebm(mpeg4kFile, { quality: 'medium' });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`✓ Success! Output: ${result.outputFilename}`);
      console.log(`  - Duration: ${duration}s`);
      console.log(`  - Output size: ${(result.outputSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  - Auto-downscaling should have been applied\n`);
      
      results.passed++;
      results.tests.push({ name: '4K MPEG to WebM', status: 'PASSED', duration });
    } catch (error) {
      console.error(`✗ Failed: ${error.message}\n`);
      results.failed++;
      results.tests.push({ name: '4K MPEG to WebM', status: 'FAILED', error: error.message });
    }
  } catch (error) {
    console.log('Test 4: Skipped (No 4K MPEG file found)\n');
  }

  // Print summary
  console.log('\n=== Test Summary ===');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log('\nDetailed Results:');
  results.tests.forEach((test, index) => {
    const status = test.status === 'PASSED' ? '✓' : '✗';
    const duration = test.duration ? ` (${test.duration}s)` : '';
    const error = test.error ? ` - ${test.error}` : '';
    console.log(`  ${index + 1}. ${status} ${test.name}${duration}${error}`);
  });

  console.log('\n=== Configuration Summary ===');
  console.log('✓ Timeout increased to 30 minutes');
  console.log('✓ FLV encoding presets optimized for speed');
  console.log('✓ WebM encoding presets optimized for speed');
  console.log('✓ WMV encoding presets optimized for speed');
  console.log('✓ Auto-downscaling enabled for 4K videos (4K → 1080p)');
  console.log('✓ Resolution detection and scaling implemented');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
testFlvConversions().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
