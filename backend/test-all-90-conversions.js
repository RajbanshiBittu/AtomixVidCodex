#!/usr/bin/env node

/**
 * Comprehensive Video Conversion Testing Script
 * Tests all 90 conversion endpoints with real video files
 * Generates detailed test report with pass/fail/reason
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:8080';
const API_BASE = '/api/v1/convert';
const TEST_FILES_DIR = '/home/atomleapa/Tasks/Revised_Task/test-video/input';
const REPORT_FILE = path.join(__dirname, 'CONVERSION_TEST_REPORT.md');
const TIMEOUT = 120000; // 2 minutes per conversion

// Test file mapping
const TEST_FILES = {
  'MP4': 'saple.mp4',
  'AVI': 'video.avi',
  'MKV': 'tests.mkv',
  'MOV': 'file.mov',
  'WMV': 'sample.wmv',
  'FLV': 'sampels.flv',
  'MPEG': 'sample_3840x2160.mpeg',
  'WEBM': 'sample-30s.webm',
  '3GP': 'sample_3840x2160.3gp',
  '3G2': null // No 3G2 test file available
};

// All conversion endpoints (90 conversions)
const CONVERSIONS = {
  // MP4 conversions (9)
  'toMP4': [
    { from: 'AVI', to: 'MP4', endpoint: '/avi-to-mp4' },
    { from: 'MOV', to: 'MP4', endpoint: '/mov-to-mp4' },
    { from: 'MKV', to: 'MP4', endpoint: '/mkv-to-mp4' },
    { from: 'WMV', to: 'MP4', endpoint: '/wmv-to-mp4' },
    { from: 'FLV', to: 'MP4', endpoint: '/flv-to-mp4' },
    { from: 'MPEG', to: 'MP4', endpoint: '/mpeg-to-mp4' },
    { from: '3GP', to: 'MP4', endpoint: '/3gp-to-mp4' },
    { from: '3G2', to: 'MP4', endpoint: '/3g2-to-mp4' },
    { from: 'WEBM', to: 'MP4', endpoint: '/webm-to-mp4' }
  ],
  // WebM conversions (9)
  'toWEBM': [
    { from: 'MP4', to: 'WEBM', endpoint: '/mp4-to-webm' },
    { from: 'MOV', to: 'WEBM', endpoint: '/mov-to-webm' },
    { from: 'MKV', to: 'WEBM', endpoint: '/mkv-to-webm' },
    { from: 'AVI', to: 'WEBM', endpoint: '/avi-to-webm' },
    { from: 'WMV', to: 'WEBM', endpoint: '/wmv-to-webm' },
    { from: 'FLV', to: 'WEBM', endpoint: '/flv-to-webm' },
    { from: 'MPEG', to: 'WEBM', endpoint: '/mpeg-to-webm' },
    { from: '3GP', to: 'WEBM', endpoint: '/3gp-to-webm' },
    { from: '3G2', to: 'WEBM', endpoint: '/3g2-to-webm' }
  ],
  // MOV conversions (9)
  'toMOV': [
    { from: 'MP4', to: 'MOV', endpoint: '/mp4-to-mov' },
    { from: 'MKV', to: 'MOV', endpoint: '/mkv-to-mov' },
    { from: 'AVI', to: 'MOV', endpoint: '/avi-to-mov' },
    { from: 'WMV', to: 'MOV', endpoint: '/wmv-to-mov' },
    { from: 'MPEG', to: 'MOV', endpoint: '/mpeg-to-mov' },
    { from: 'FLV', to: 'MOV', endpoint: '/flv-to-mov' },
    { from: 'WEBM', to: 'MOV', endpoint: '/webm-to-mov' },
    { from: '3GP', to: 'MOV', endpoint: '/3gp-to-mov' },
    { from: '3G2', to: 'MOV', endpoint: '/3g2-to-mov' }
  ],
  // MPEG conversions (9)
  'toMPEG': [
    { from: 'MP4', to: 'MPEG', endpoint: '/mp4-to-mpeg' },
    { from: 'MKV', to: 'MPEG', endpoint: '/mkv-to-mpeg' },
    { from: 'AVI', to: 'MPEG', endpoint: '/avi-to-mpeg' },
    { from: 'WMV', to: 'MPEG', endpoint: '/wmv-to-mpeg' },
    { from: 'MOV', to: 'MPEG', endpoint: '/mov-to-mpeg' },
    { from: 'WEBM', to: 'MPEG', endpoint: '/webm-to-mpeg' },
    { from: 'FLV', to: 'MPEG', endpoint: '/flv-to-mpeg' },
    { from: '3GP', to: 'MPEG', endpoint: '/3gp-to-mpeg' },
    { from: '3G2', to: 'MPEG', endpoint: '/3g2-to-mpeg' }
  ],
  // WMV conversions (9)
  'toWMV': [
    { from: 'MP4', to: 'WMV', endpoint: '/mp4-to-wmv' },
    { from: 'MKV', to: 'WMV', endpoint: '/mkv-to-wmv' },
    { from: 'AVI', to: 'WMV', endpoint: '/avi-to-wmv' },
    { from: 'WEBM', to: 'WMV', endpoint: '/webm-to-wmv' },
    { from: 'MOV', to: 'WMV', endpoint: '/mov-to-wmv' },
    { from: 'MPEG', to: 'WMV', endpoint: '/mpeg-to-wmv' },
    { from: 'FLV', to: 'WMV', endpoint: '/flv-to-wmv' },
    { from: '3GP', to: 'WMV', endpoint: '/3gp-to-wmv' },
    { from: '3G2', to: 'WMV', endpoint: '/3g2-to-wmv' }
  ],
  // MKV conversions (10)
  'toMKV': [
    { from: 'MP4', to: 'MKV', endpoint: '/mp4-to-mkv' },
    { from: 'MKV', to: 'MKV', endpoint: '/mkv-to-mkv' },
    { from: 'AVI', to: 'MKV', endpoint: '/avi-to-mkv' },
    { from: 'WEBM', to: 'MKV', endpoint: '/webm-to-mkv' },
    { from: 'MOV', to: 'MKV', endpoint: '/mov-to-mkv' },
    { from: 'WMV', to: 'MKV', endpoint: '/wmv-to-mkv' },
    { from: 'MPEG', to: 'MKV', endpoint: '/mpeg-to-mkv' },
    { from: 'FLV', to: 'MKV', endpoint: '/flv-to-mkv' },
    { from: '3GP', to: 'MKV', endpoint: '/3gp-to-mkv' },
    { from: '3G2', to: 'MKV', endpoint: '/3g2-to-mkv' }
  ],
  // AVI conversions (9)
  'toAVI': [
    { from: 'MP4', to: 'AVI', endpoint: '/mp4-to-avi' },
    { from: 'MKV', to: 'AVI', endpoint: '/mkv-to-avi' },
    { from: 'WMV', to: 'AVI', endpoint: '/wmv-to-avi' },
    { from: 'MOV', to: 'AVI', endpoint: '/mov-to-avi' },
    { from: 'MPEG', to: 'AVI', endpoint: '/mpeg-to-avi' },
    { from: 'WEBM', to: 'AVI', endpoint: '/webm-to-avi' },
    { from: 'FLV', to: 'AVI', endpoint: '/flv-to-avi' },
    { from: '3GP', to: 'AVI', endpoint: '/3gp-to-avi' },
    { from: '3G2', to: 'AVI', endpoint: '/3g2-to-avi' }
  ],
  // FLV conversions (9)
  'toFLV': [
    { from: 'MP4', to: 'FLV', endpoint: '/mp4-to-flv' },
    { from: 'MKV', to: 'FLV', endpoint: '/mkv-to-flv' },
    { from: 'AVI', to: 'FLV', endpoint: '/avi-to-flv' },
    { from: 'WMV', to: 'FLV', endpoint: '/wmv-to-flv' },
    { from: 'MOV', to: 'FLV', endpoint: '/mov-to-flv' },
    { from: 'MPEG', to: 'FLV', endpoint: '/mpeg-to-flv' },
    { from: 'WEBM', to: 'FLV', endpoint: '/webm-to-flv' },
    { from: '3GP', to: 'FLV', endpoint: '/3gp-to-flv' },
    { from: '3G2', to: 'FLV', endpoint: '/3g2-to-flv' }
  ],
  // 3GP conversions (9)
  'to3GP': [
    { from: 'MP4', to: '3GP', endpoint: '/mp4-to-3gp' },
    { from: 'MKV', to: '3GP', endpoint: '/mkv-to-3gp' },
    { from: 'AVI', to: '3GP', endpoint: '/avi-to-3gp' },
    { from: 'WMV', to: '3GP', endpoint: '/wmv-to-3gp' },
    { from: 'MOV', to: '3GP', endpoint: '/mov-to-3gp' },
    { from: 'MPEG', to: '3GP', endpoint: '/mpeg-to-3gp' },
    { from: 'WEBM', to: '3GP', endpoint: '/webm-to-3gp' },
    { from: 'FLV', to: '3GP', endpoint: '/flv-to-3gp' },
    { from: '3G2', to: '3GP', endpoint: '/3g2-to-3gp' }
  ],
  // 3G2 conversions (9)
  'to3G2': [
    { from: 'MP4', to: '3G2', endpoint: '/mp4-to-3g2' },
    { from: 'MKV', to: '3G2', endpoint: '/mkv-to-3g2' },
    { from: 'AVI', to: '3G2', endpoint: '/avi-to-3g2' },
    { from: 'WMV', to: '3G2', endpoint: '/wmv-to-3g2' },
    { from: 'MOV', to: '3G2', endpoint: '/mov-to-3g2' },
    { from: 'MPEG', to: '3G2', endpoint: '/mpeg-to-3g2' },
    { from: 'WEBM', to: '3G2', endpoint: '/webm-to-3g2' },
    { from: 'FLV', to: '3G2', endpoint: '/flv-to-3g2' },
    { from: '3GP', to: '3G2', endpoint: '/3gp-to-3g2' }
  ]
};

// Test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Test a single conversion
 */
async function testConversion(conversion) {
  const { from, to, endpoint } = conversion;
  const testFile = TEST_FILES[from];

  results.total++;

  // Skip if no test file
  if (!testFile) {
    results.skipped++;
    results.details.push({
      from, to, endpoint,
      status: 'SKIPPED',
      reason: `No ${from} test file available`,
      duration: 0
    });
    console.log(`${colors.yellow}⏭️  SKIP${colors.reset} ${from} → ${to}: No test file`);
    return;
  }

  const filePath = path.join(TEST_FILES_DIR, testFile);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    results.skipped++;
    results.details.push({
      from, to, endpoint,
      status: 'SKIPPED',
      reason: `Test file not found: ${testFile}`,
      duration: 0
    });
    console.log(`${colors.yellow}⏭️  SKIP${colors.reset} ${from} → ${to}: File not found`);
    return;
  }

  const startTime = Date.now();

  try {
    // Create form data
    const form = new FormData();
    form.append('video', fs.createReadStream(filePath));
    form.append('quality', 'medium');

    // Make request
    const response = await axios.post(
      `${BASE_URL}${API_BASE}${endpoint}`,
      form,
      {
        headers: form.getHeaders(),
        timeout: TIMEOUT,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (response.data.success) {
      results.passed++;
      results.details.push({
        from, to, endpoint,
        status: 'PASS',
        duration: `${duration}s`,
        outputFile: response.data.data?.outputFilename || 'N/A',
        inputSize: fs.statSync(filePath).size,
        outputSize: response.data.data?.outputSize || 0
      });
      console.log(`${colors.green}✓ PASS${colors.reset} ${from} → ${to} (${duration}s)`);
    } else {
      results.failed++;
      results.details.push({
        from, to, endpoint,
        status: 'FAIL',
        reason: response.data.message || response.data.error || 'Unknown error',
        duration: `${duration}s`
      });
      console.log(`${colors.red}✗ FAIL${colors.reset} ${from} → ${to}: ${response.data.message}`);
    }

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    results.failed++;
    
    let reason = 'Unknown error';
    if (error.code === 'ECONNREFUSED') {
      reason = 'Server not running';
    } else if (error.code === 'ETIMEDOUT') {
      reason = 'Request timeout';
    } else if (error.response) {
      reason = error.response.data?.message || error.response.data?.error || `HTTP ${error.response.status}`;
    } else {
      reason = error.message;
    }

    results.details.push({
      from, to, endpoint,
      status: 'FAIL',
      reason,
      duration: `${duration}s`
    });
    console.log(`${colors.red}✗ FAIL${colors.reset} ${from} → ${to}: ${reason}`);
  }
}

/**
 * Generate markdown report
 */
function generateReport() {
  const timestamp = new Date().toISOString();
  const passRate = ((results.passed / results.total) * 100).toFixed(2);

  let report = `# Video Conversion Test Report\n\n`;
  report += `**Generated:** ${timestamp}\n\n`;
  report += `## Summary\n\n`;
  report += `| Metric | Count | Percentage |\n`;
  report += `|--------|-------|------------|\n`;
  report += `| **Total Tests** | ${results.total} | 100% |\n`;
  report += `| **Passed** | ${results.passed} | ${passRate}% |\n`;
  report += `| **Failed** | ${results.failed} | ${((results.failed / results.total) * 100).toFixed(2)}% |\n`;
  report += `| **Skipped** | ${results.skipped} | ${((results.skipped / results.total) * 100).toFixed(2)}% |\n\n`;

  // Group results by target format
  report += `## Detailed Results\n\n`;
  
  for (const [category, conversions] of Object.entries(CONVERSIONS)) {
    const targetFormat = category.replace('to', '');
    report += `### ${targetFormat} Conversions (${conversions.length})\n\n`;
    report += `| From | Endpoint | Status | Duration | Details |\n`;
    report += `|------|----------|--------|----------|----------|\n`;

    for (const conv of conversions) {
      const result = results.details.find(r => r.endpoint === conv.endpoint);
      if (result) {
        const status = result.status === 'PASS' ? '✅ PASS' : 
                      result.status === 'SKIP' ? '⏭️  SKIP' : '❌ FAIL';
        const details = result.status === 'PASS' ? 
          `${(result.inputSize / 1024 / 1024).toFixed(2)}MB → ${(result.outputSize / 1024 / 1024).toFixed(2)}MB` :
          result.reason || 'N/A';
        report += `| ${result.from} | \`${result.endpoint}\` | ${status} | ${result.duration} | ${details} |\n`;
      }
    }
    report += `\n`;
  }

  // Failed tests section
  const failedTests = results.details.filter(r => r.status === 'FAIL');
  if (failedTests.length > 0) {
    report += `## Failed Tests Analysis\n\n`;
    report += `| Conversion | Endpoint | Reason |\n`;
    report += `|------------|----------|--------|\n`;
    for (const test of failedTests) {
      report += `| ${test.from} → ${test.to} | \`${test.endpoint}\` | ${test.reason} |\n`;
    }
    report += `\n`;
  }

  // Skipped tests section
  const skippedTests = results.details.filter(r => r.status === 'SKIPPED');
  if (skippedTests.length > 0) {
    report += `## Skipped Tests\n\n`;
    report += `| Conversion | Reason |\n`;
    report += `|------------|--------|\n`;
    for (const test of skippedTests) {
      report += `| ${test.from} → ${test.to} | ${test.reason} |\n`;
    }
    report += `\n`;
  }

  // Performance summary
  const passedTests = results.details.filter(r => r.status === 'PASS');
  if (passedTests.length > 0) {
    const avgDuration = passedTests.reduce((sum, t) => sum + parseFloat(t.duration), 0) / passedTests.length;
    const fastest = passedTests.reduce((min, t) => parseFloat(t.duration) < parseFloat(min.duration) ? t : min);
    const slowest = passedTests.reduce((max, t) => parseFloat(t.duration) > parseFloat(max.duration) ? t : max);

    report += `## Performance Statistics\n\n`;
    report += `- **Average Duration:** ${avgDuration.toFixed(2)}s\n`;
    report += `- **Fastest:** ${fastest.from} → ${fastest.to} (${fastest.duration})\n`;
    report += `- **Slowest:** ${slowest.from} → ${slowest.to} (${slowest.duration})\n\n`;
  }

  // Recommendations
  report += `## Recommendations\n\n`;
  if (results.failed > 0) {
    report += `- ⚠️  **${results.failed} conversions failed** - Review error logs and FFmpeg configuration\n`;
  }
  if (results.skipped > 0) {
    report += `- ℹ️  **${results.skipped} conversions skipped** - Add missing test files for complete coverage\n`;
  }
  if (passRate >= 90) {
    report += `- ✅ **Excellent coverage** - ${passRate}% pass rate\n`;
  } else if (passRate >= 70) {
    report += `- ⚠️  **Good coverage** - ${passRate}% pass rate, but improvements needed\n`;
  } else {
    report += `- ❌ **Poor coverage** - ${passRate}% pass rate, critical issues need attention\n`;
  }

  return report;
}

/**
 * Main test execution
 */
async function runAllTests() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║  Comprehensive Video Conversion Testing - 90 Conversions  ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.blue}📂 Test Files Directory:${colors.reset} ${TEST_FILES_DIR}`);
  console.log(`${colors.blue}🌐 API Base URL:${colors.reset} ${BASE_URL}${API_BASE}`);
  console.log(`${colors.blue}📄 Report File:${colors.reset} ${REPORT_FILE}\n`);

  const startTime = Date.now();

  // Test each category sequentially to avoid overwhelming the server
  for (const [category, conversions] of Object.entries(CONVERSIONS)) {
    const targetFormat = category.replace('to', '');
    console.log(`\n${colors.cyan}━━━ Testing ${targetFormat} Conversions (${conversions.length}) ━━━${colors.reset}\n`);

    for (const conversion of conversions) {
      await testConversion(conversion);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print summary
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║                      Test Summary                          ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  console.log(`${colors.blue}Total Tests:${colors.reset} ${results.total}`);
  console.log(`${colors.green}Passed:${colors.reset} ${results.passed} (${((results.passed / results.total) * 100).toFixed(2)}%)`);
  console.log(`${colors.red}Failed:${colors.reset} ${results.failed} (${((results.failed / results.total) * 100).toFixed(2)}%)`);
  console.log(`${colors.yellow}Skipped:${colors.reset} ${results.skipped} (${((results.skipped / results.total) * 100).toFixed(2)}%)`);
  console.log(`${colors.blue}Total Duration:${colors.reset} ${totalDuration}s\n`);

  // Generate and save report
  const report = generateReport();
  fs.writeFileSync(REPORT_FILE, report);
  console.log(`${colors.green}✓ Report generated:${colors.reset} ${REPORT_FILE}\n`);

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error.message);
  process.exit(1);
});
