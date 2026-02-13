#!/usr/bin/env node

/**
 * Quick Smoke Test - Validates Critical Fixes
 * Tests a subset of conversions to verify outputPath fix and MIME type support
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  apiBaseUrl: 'http://localhost:8080/api/v1',
  testVideoDir: '/home/atomleapa/Tasks/Revised_Task/test-video/input'
};

// Smoke test cases (selective conversions to verify fixes)
const SMOKE_TESTS = [
  { source: 'mp4', target: 'webm', description: 'Basic conversion' },
  { source: 'mp4', target: 'mkv', description: 'outputPath verification' },
  { source: 'webm', target: 'mp4', description: 'Reverse conversion' },
  { source: 'mov', target: 'mp4', description: 'MOV source test' },
  { source: 'mp4', target: 'avi', description: 'Test Multer issue' },
  { source: 'mkv', target: 'wmv', description: 'Test FFmpeg code 234' },
  { source: 'avi', target: 'mp4', description: 'AVI source test' },
  { source: 'mp4', target: 'mov', description: 'MOV target test' },
  { source: 'webm', target: 'mkv', description: 'Cross-format test' }
];

function getMimeType(format) {
  const mimeTypes = {
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'mkv': 'video/x-matroska',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'mpeg': 'video/mpeg',
    '3gp': 'video/3gpp',
    '3g2': 'video/3gpp2'
  };
  return mimeTypes[format] || 'video/mp4';
}

function findTestFile(format) {
  const files = fs.readdirSync(CONFIG.testVideoDir);
  
  let testFile = files.find(f => {
    const ext = path.extname(f).toLowerCase().substring(1);
    return ext === format;
  });
  
  if (!testFile && format === '3gp') {
    testFile = files.find(f => f.includes('3gp'));
  }
  
  return testFile ? path.join(CONFIG.testVideoDir, testFile) : null;
}

async function testConversion(sourceFormat, targetFormat, description) {
  const testFile = findTestFile(sourceFormat);
  
  if (!testFile) {
    return {
      status: 'skipped',
      reason: `No test file for ${sourceFormat}`,
      source: sourceFormat,
      target: targetFormat
    };
  }
  
  const endpoint = `${CONFIG.apiBaseUrl}/convert/${sourceFormat}-to-${targetFormat}`;
  const startTime = Date.now();
  
  try {
    const formData = new FormData();
    const fileStream = fs.createReadStream(testFile);
    const fileName = path.basename(testFile);
    const mimeType = getMimeType(sourceFormat);
    
    formData.append('video', fileStream, {
      filename: fileName,
      contentType: mimeType
    });
    
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const duration = Date.now() - startTime;
    const responseData = await response.json();
    
    // Verify outputPath exists
    const hasOutputPath = responseData.data && responseData.data.outputPath;
    
    if (response.ok && responseData.success) {
      return {
        status: 'passed',
        source: sourceFormat,
        target: targetFormat,
        duration,
        hasOutputPath,
        outputPath: responseData.data.outputPath,
        outputFilename: responseData.data.outputFilename,
        httpStatus: response.status
      };
    } else {
      return {
        status: 'failed',
        source: sourceFormat,
        target: targetFormat,
        duration,
        httpStatus: response.status,
        error: responseData.error,
        message: responseData.message,
        hasOutputPath
      };
    }
  } catch (error) {
    return {
      status: 'error',
      source: sourceFormat,
      target: targetFormat,
      duration: Date.now() - startTime,
      error: error.name,
      message: error.message
    };
  }
}

async function runSmokeTests() {
  console.log('🧪 Running Smoke Tests\n');
  console.log('Testing critical fixes:');
  console.log('  1. outputPath field in API responses');
  console.log('  2. MIME type support in uploads');
  console.log('  3. General conversion functionality\n');
  console.log('=' .repeat(80));
  
  const results = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  
  for (let i = 0; i < SMOKE_TESTS.length; i++) {
    const test = SMOKE_TESTS[i];
    const testNum = i + 1;
    
    console.log(`\n[${testNum}/${SMOKE_TESTS.length}] ${test.source.toUpperCase()} → ${test.target.toUpperCase()}`);
    console.log(`   Description: ${test.description}`);
    
    const result = await testConversion(test.source, test.target, test.description);
    results.push(result);
    
    if (result.status === 'passed') {
      passed++;
      console.log(`   ✅ PASSED (${(result.duration / 1000).toFixed(2)}s)`);
      console.log(`   📦 Output: ${result.outputFilename}`);
      console.log(`   📁 Path: ${result.outputPath ? '✅ Present' : '❌ Missing'}`);
    } else if (result.status === 'failed') {
      failed++;
      console.log(`   ❌ FAILED (${(result.duration / 1000).toFixed(2)}s)`);
      console.log(`   🔍 Error: ${result.error} - ${result.message}`);
      console.log(`   📁 outputPath: ${result.hasOutputPath ? '✅ Present' : '❌ Missing'}`);
    } else if (result.status === 'skipped') {
      skipped++;
      console.log(`   ⏭️  SKIPPED: ${result.reason}`);
    } else {
      failed++;
      console.log(`   ❌ ERROR: ${result.error} - ${result.message}`);
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 SMOKE TEST RESULTS\n');
  console.log(`Total Tests: ${SMOKE_TESTS.length}`);
  console.log(`✅ Passed:   ${passed}`);
  console.log(`❌ Failed:   ${failed}`);
  console.log(`⏭️  Skipped:  ${skipped}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);
  
  // Check outputPath fix
  const withOutputPath = results.filter(r => r.status === 'passed' && r.hasOutputPath).length;
  const passedTests = results.filter(r => r.status === 'passed').length;
  
  console.log('\n🔍 Fix Verification:');
  console.log(`   outputPath field: ${withOutputPath}/${passedTests} passed tests have it (${passedTests > 0 ? (withOutputPath / passedTests * 100).toFixed(0) : 0}%)`);
  
  if (withOutputPath === passedTests && passedTests > 0) {
    console.log('   ✅ outputPath fix VERIFIED - All passed tests include outputPath!');
  } else if (passedTests === 0) {
    console.log('   ⚠️  No tests passed - cannot verify outputPath fix');
  } else {
    console.log('   ⚠️  outputPath fix INCOMPLETE - Some passed tests missing outputPath');
  }
  
  // Detailed failure analysis
  const failures = results.filter(r => r.status === 'failed' || r.status === 'error');
  if (failures.length > 0) {
    console.log('\n❌ Failed Test Details:');
    failures.forEach((f, i) => {
      console.log(`\n   ${i + 1}. ${f.source.toUpperCase()} → ${f.target.toUpperCase()}`);
      console.log(`      Error: ${f.error}`);
      console.log(`      Message: ${f.message}`);
      console.log(`      HTTP Status: ${f.httpStatus || 'N/A'}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  if (passed === SMOKE_TESTS.length) {
    console.log('🎉 All smoke tests passed! System is ready for full test suite.');
    process.exit(0);
  } else if (passed > 0) {
    console.log('⚠️  Some tests passed. Review failures before running full suite.');
    process.exit(1);
  } else {
    console.log('❌ All tests failed. Fix critical issues before proceeding.');
    process.exit(1);
  }
}

console.log('🚀 Starting Smoke Test Suite...\n');
runSmokeTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
