#!/usr/bin/env node

/**
 * Comprehensive Video Conversion Testing Suite
 * Tests all 90 format-to-format conversion combinations
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  apiBaseUrl: 'http://localhost:8080/api/v1',
  testVideoDir: '/home/atomleapa/Tasks/Revised_Task/test-video/input',
  outputDir: path.join(__dirname, 'test-results'),
  maxRetries: 2,
  retryDelay: 3000 // 3 seconds
};

// All supported formats
const FORMATS = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'mpeg', '3gp', '3g2'];

// Test results storage
const testResults = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  startTime: null,
  endTime: null,
  conversions: [],
  summary: {}
};

/**
 * Initialize test environment
 */
async function initializeTests() {
  console.log('🚀 Initializing Comprehensive Video Conversion Test Suite\n');
  console.log('=' .repeat(80));
  
  // Create output directory
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // Verify API is reachable
  try {
    const response = await fetch(`http://localhost:8080/`);
    const data = await response.json();
    console.log('✅ API Server is reachable');
    console.log(`   Version: ${data.version}`);
    console.log(`   Endpoints available: ${Object.keys(data.endpoints).length}`);
  } catch (error) {
    console.error('❌ Failed to reach API server. Please ensure it is running on port 8080');
    process.exit(1);
  }
  
  // List available test files
  console.log('\n📂 Scanning test video directory...');
  const testFiles = fs.readdirSync(CONFIG.testVideoDir);
  console.log(`   Found ${testFiles.length} files in ${CONFIG.testVideoDir}`);
  
  testFiles.forEach(file => {
    const stats = fs.statSync(path.join(CONFIG.testVideoDir, file));
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`   - ${file} (${sizeMB} MB)`);
  });
  
  console.log('=' .repeat(80));
  console.log('\n');
}

/**
 * Get endpoint for conversion
 */
function getConversionEndpoint(sourceFormat, targetFormat) {
  // Normalize format names for URL
  const source = sourceFormat === '3gp' ? '3gp' : sourceFormat === '3g2' ? '3g2' : sourceFormat;
  const target = targetFormat === '3gp' ? '3gp' : targetFormat === '3g2' ? '3g2' : targetFormat;
  
  return `${CONFIG.apiBaseUrl}/convert/${source}-to-${target}`;
}

/**
 * Find test file for given format
 */
function findTestFile(format) {
  const files = fs.readdirSync(CONFIG.testVideoDir);
  
  // Try exact extension match first
  let testFile = files.find(f => {
    const ext = path.extname(f).toLowerCase().substring(1);
    return ext === format;
  });
  
  // If not found and format is 3gp or 3g2, try alternative names
  if (!testFile) {
    if (format === '3gp') {
      testFile = files.find(f => f.includes('3gp'));
    } else if (format === '3g2') {
      testFile = files.find(f => f.includes('3g2'));
    }
  }
  
  return testFile ? path.join(CONFIG.testVideoDir, testFile) : null;
}

/**
 * Get MIME type for format
 */
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

/**
 * Perform a single conversion test
 */
async function testConversion(sourceFormat, targetFormat, attempt = 1) {
  const testId = `${sourceFormat}-to-${targetFormat}`;
  const testFile = findTestFile(sourceFormat);
  
  if (!testFile) {
    return {
      id: testId,
      source: sourceFormat,
      target: targetFormat,
      status: 'skipped',
      reason: `No test file found for ${sourceFormat} format`,
      duration: 0
    };
  }
  
  const endpoint = getConversionEndpoint(sourceFormat, targetFormat);
  const startTime = Date.now();
  
  try {
    // Prepare form data with correct MIME type
    const formData = new FormData();
    const fileStream = fs.createReadStream(testFile);
    const fileName = path.basename(testFile);
    const mimeType = getMimeType(sourceFormat);
    
    formData.append('video', fileStream, {
      filename: fileName,
      contentType: mimeType
    });
    
    console.log(`   📤 Uploading ${fileName} (${(fs.statSync(testFile).size / (1024 * 1024)).toFixed(2)} MB)`);
    
    // Make API request
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const duration = Date.now() - startTime;
    const responseData = await response.json();
    
    if (response.ok && responseData.success) {
      // Verify output file exists
      const outputPath = path.join(__dirname, responseData.data.outputPath);
      const outputExists = fs.existsSync(outputPath);
      const outputSize = outputExists ? fs.statSync(outputPath).size : 0;
      
      return {
        id: testId,
        source: sourceFormat,
        target: targetFormat,
        status: 'passed',
        duration,
        inputFile: fileName,
        inputSize: fs.statSync(testFile).size,
        outputFile: responseData.data.fileName,
        outputSize,
        outputExists,
        response: responseData
      };
    } else {
      // Check if we should retry
      if (attempt < CONFIG.maxRetries && response.status >= 500) {
        console.log(`   ⚠️  Server error (${response.status}), retrying in ${CONFIG.retryDelay}ms... (attempt ${attempt + 1}/${CONFIG.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
        return testConversion(sourceFormat, targetFormat, attempt + 1);
      }
      
      return {
        id: testId,
        source: sourceFormat,
        target: targetFormat,
        status: 'failed',
        duration,
        inputFile: fileName,
        httpStatus: response.status,
        error: responseData.error || response.statusText,
        message: responseData.message,
        details: responseData.details,
        attempt
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Retry on network errors
    if (attempt < CONFIG.maxRetries) {
      console.log(`   ⚠️  Network error, retrying in ${CONFIG.retryDelay}ms... (attempt ${attempt + 1}/${CONFIG.maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      return testConversion(sourceFormat, targetFormat, attempt + 1);
    }
    
    return {
      id: testId,
      source: sourceFormat,
      target: targetFormat,
      status: 'failed',
      duration,
      error: error.name,
      message: error.message,
      stack: error.stack,
      attempt
    };
  }
}

/**
 * Run all conversion tests
 */
async function runAllTests() {
  testResults.startTime = new Date();
  
  console.log('\n🧪 Starting Conversion Tests...\n');
  console.log('=' .repeat(80));
  
  let testNumber = 1;
  
  for (const sourceFormat of FORMATS) {
    console.log(`\n📥 Testing conversions FROM ${sourceFormat.toUpperCase()}:`);
    console.log('-' .repeat(80));
    
    for (const targetFormat of FORMATS) {
      // Skip same-format conversions
      if (sourceFormat === targetFormat) {
        console.log(`   ⏭️  Skipping ${sourceFormat}-to-${targetFormat} (same format)`);
        testResults.skipped++;
        continue;
      }
      
      testResults.totalTests++;
      console.log(`\n[${testNumber}/${90}] Testing: ${sourceFormat.toUpperCase()} → ${targetFormat.toUpperCase()}`);
      
      const result = await testConversion(sourceFormat, targetFormat);
      testResults.conversions.push(result);
      
      if (result.status === 'passed') {
        testResults.passed++;
        console.log(`   ✅ PASSED (${(result.duration / 1000).toFixed(2)}s)`);
        console.log(`   📦 Output: ${result.outputFile} (${(result.outputSize / (1024 * 1024)).toFixed(2)} MB)`);
      } else if (result.status === 'failed') {
        testResults.failed++;
        console.log(`   ❌ FAILED (${(result.duration / 1000).toFixed(2)}s)`);
        console.log(`   🔍 Error: ${result.error} - ${result.message}`);
        if (result.details) {
          console.log(`   📝 Details: ${result.details}`);
        }
      } else if (result.status === 'skipped') {
        testResults.skipped++;
        console.log(`   ⏭️  SKIPPED: ${result.reason}`);
      }
      
      testNumber++;
      
      // Small delay between tests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  testResults.endTime = new Date();
  console.log('\n' + '='.repeat(80));
  console.log('✨ All tests completed!\n');
}

/**
 * Generate summary statistics
 */
function generateSummary() {
  const duration = (testResults.endTime - testResults.startTime) / 1000;
  const successRate = testResults.totalTests > 0 
    ? ((testResults.passed / testResults.totalTests) * 100).toFixed(2)
    : 0;
  
  // Group by source format
  FORMATS.forEach(format => {
    const fromFormat = testResults.conversions.filter(c => c.source === format);
    const passed = fromFormat.filter(c => c.status === 'passed').length;
    const failed = fromFormat.filter(c => c.status === 'failed').length;
    const skipped = fromFormat.filter(c => c.status === 'skipped').length;
    
    testResults.summary[format] = {
      total: fromFormat.length,
      passed,
      failed,
      skipped,
      successRate: fromFormat.length > 0 ? ((passed / fromFormat.length) * 100).toFixed(2) : 0
    };
  });
  
  return {
    duration,
    successRate,
    avgTestDuration: testResults.totalTests > 0
      ? (testResults.conversions.reduce((sum, c) => sum + (c.duration || 0), 0) / testResults.totalTests / 1000).toFixed(2)
      : 0
  };
}

/**
 * Generate detailed report
 */
function generateReport() {
  const stats = generateSummary();
  
  let report = '';
  
  // Header
  report += '# 📊 Video Conversion Comprehensive Test Report\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Test Duration:** ${stats.duration.toFixed(2)} seconds\n`;
  report += `**API Base URL:** ${CONFIG.apiBaseUrl}\n`;
  report += `**Test Files Directory:** ${CONFIG.testVideoDir}\n\n`;
  
  report += '---\n\n';
  
  // Executive Summary
  report += '## 📈 Executive Summary\n\n';
  report += '| Metric | Value |\n';
  report += '|--------|-------|\n';
  report += `| **Total Conversions Tested** | ${testResults.totalTests} |\n`;
  report += `| **Passed** | ✅ ${testResults.passed} |\n`;
  report += `| **Failed** | ❌ ${testResults.failed} |\n`;
  report += `| **Skipped** | ⏭️ ${testResults.skipped} |\n`;
  report += `| **Success Rate** | ${stats.successRate}% |\n`;
  report += `| **Average Test Duration** | ${stats.avgTestDuration}s |\n\n`;
  
  // Conversion Matrix
  report += '## 🎯 Conversion Matrix\n\n';
  report += 'Legend: ✅ Pass | ❌ Fail | ⏭️ Skip | - N/A\n\n';
  
  // Matrix header
  report += '| FROM \\ TO | ' + FORMATS.map(f => f.toUpperCase()).join(' | ') + ' |\n';
  report += '|' + '-'.repeat(11) + '|' + FORMATS.map(() => '-----').join('|') + '|\n';
  
  // Matrix rows
  FORMATS.forEach(source => {
    report += `| **${source.toUpperCase()}** |`;
    FORMATS.forEach(target => {
      if (source === target) {
        report += ' - |';
      } else {
        const result = testResults.conversions.find(c => c.source === source && c.target === target);
        if (result) {
          if (result.status === 'passed') report += ' ✅ |';
          else if (result.status === 'failed') report += ' ❌ |';
          else if (result.status === 'skipped') report += ' ⏭️ |';
        } else {
          report += ' ? |';
        }
      }
    });
    report += '\n';
  });
  report += '\n';
  
  // Per-Format Summary
  report += '## 📊 Per-Format Performance\n\n';
  FORMATS.forEach(format => {
    const summary = testResults.summary[format];
    if (summary) {
      report += `### ${format.toUpperCase()}\n`;
      report += `- Total Tests: ${summary.total}\n`;
      report += `- Passed: ✅ ${summary.passed}\n`;
      report += `- Failed: ❌ ${summary.failed}\n`;
      report += `- Skipped: ⏭️ ${summary.skipped}\n`;
      report += `- Success Rate: ${summary.successRate}%\n\n`;
    }
  });
  
  // Failed Conversions Details
  const failures = testResults.conversions.filter(c => c.status === 'failed');
  if (failures.length > 0) {
    report += '## ❌ Failed Conversions - Detailed Analysis\n\n';
    failures.forEach((failure, index) => {
      report += `### ${index + 1}. ${failure.source.toUpperCase()} → ${failure.target.toUpperCase()}\n\n`;
      report += `**Test ID:** \`${failure.id}\`\n`;
      report += `**Input File:** ${failure.inputFile || 'N/A'}\n`;
      report += `**Duration:** ${((failure.duration || 0) / 1000).toFixed(2)}s\n`;
      if (failure.httpStatus) report += `**HTTP Status:** ${failure.httpStatus}\n`;
      if (failure.error) report += `**Error:** ${failure.error}\n`;
      if (failure.message) report += `**Message:** ${failure.message}\n`;
      if (failure.details) report += `**Details:** ${failure.details}\n`;
      if (failure.attempt) report += `**Attempts:** ${failure.attempt}\n`;
      report += '\n';
      
      // Add stack trace for debugging
      if (failure.stack) {
        report += '<details>\n<summary>Stack Trace</summary>\n\n```\n';
        report += failure.stack;
        report += '\n```\n</details>\n\n';
      }
    });
  } else {
    report += '## ✅ No Failed Conversions\n\nAll tested conversions completed successfully!\n\n';
  }
  
  // Skipped Conversions
  const skipped = testResults.conversions.filter(c => c.status === 'skipped');
  if (skipped.length > 0) {
    report += '## ⏭️ Skipped Conversions\n\n';
    skipped.forEach((skip, index) => {
      report += `${index + 1}. **${skip.source.toUpperCase()} → ${skip.target.toUpperCase()}** - ${skip.reason}\n`;
    });
    report += '\n';
  }
  
  // Performance Insights
  report += '## ⚡ Performance Insights\n\n';
  const passedTests = testResults.conversions.filter(c => c.status === 'passed');
  
  if (passedTests.length > 0) {
    // Fastest conversion
    const fastest = passedTests.reduce((min, c) => c.duration < min.duration ? c : min);
    report += `**Fastest Conversion:** ${fastest.source.toUpperCase()} → ${fastest.target.toUpperCase()} (${(fastest.duration / 1000).toFixed(2)}s)\n\n`;
    
    // Slowest conversion
    const slowest = passedTests.reduce((max, c) => c.duration > max.duration ? c : max);
    report += `**Slowest Conversion:** ${slowest.source.toUpperCase()} → ${slowest.target.toUpperCase()} (${(slowest.duration / 1000).toFixed(2)}s)\n\n`;
    
    // Compression efficiency
    const withSizes = passedTests.filter(c => c.inputSize && c.outputSize);
    if (withSizes.length > 0) {
      const avgCompression = withSizes.reduce((sum, c) => {
        const ratio = ((c.inputSize - c.outputSize) / c.inputSize) * 100;
        return sum + ratio;
      }, 0) / withSizes.length;
      
      report += `**Average Size Reduction:** ${avgCompression.toFixed(2)}%\n\n`;
      
      // Best compression
      const bestCompression = withSizes.reduce((best, c) => {
        const ratio = ((c.inputSize - c.outputSize) / c.inputSize) * 100;
        const bestRatio = ((best.inputSize - best.outputSize) / best.inputSize) * 100;
        return ratio > bestRatio ? c : best;
      });
      const bestRatio = ((bestCompression.inputSize - bestCompression.outputSize) / bestCompression.inputSize) * 100;
      report += `**Best Compression:** ${bestCompression.source.toUpperCase()} → ${bestCompression.target.toUpperCase()} (${bestRatio.toFixed(2)}% reduction)\n\n`;
    }
  }
  
  // Recommendations
  report += '## 💡 Recommendations\n\n';
  if (testResults.failed === 0) {
    report += '✅ **All conversions are working correctly!** The system is production-ready.\n\n';
  } else {
    report += `⚠️ **${testResults.failed} conversion(s) failed.** Review the detailed failure analysis above and:\n\n`;
    report += '1. Check FFmpeg configuration for failed format combinations\n';
    report += '2. Verify codec compatibility for source/target format pairs\n';
    report += '3. Review error logs for specific FFmpeg command issues\n';
    report += '4. Test with different input files to isolate file-specific vs format-specific issues\n';
    report += '5. Consider increasing timeout values for large file conversions\n\n';
  }
  
  if (testResults.skipped > 0) {
    report += `📝 **${testResults.skipped} conversion(s) skipped** due to missing test files. Add test files for these formats:\n\n`;
    const missingFormats = new Set(skipped.map(s => s.source));
    missingFormats.forEach(format => {
      report += `- ${format.toUpperCase()}\n`;
    });
    report += '\n';
  }
  
  // Footer
  report += '---\n\n';
  report += '*Report generated by Atomix-VidCodex Comprehensive Test Suite*\n';
  
  return report;
}

/**
 * Save report to file
 */
function saveReport(report) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(CONFIG.outputDir, `test-report-${timestamp}.md`);
  const jsonPath = path.join(CONFIG.outputDir, `test-results-${timestamp}.json`);
  
  fs.writeFileSync(reportPath, report);
  fs.writeFileSync(jsonPath, JSON.stringify(testResults, null, 2));
  
  console.log(`\n📄 Report saved to: ${reportPath}`);
  console.log(`📊 JSON results saved to: ${jsonPath}`);
}

/**
 * Display summary in console
 */
function displaySummary() {
  const stats = generateSummary();
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests:     ${testResults.totalTests}`);
  console.log(`✅ Passed:        ${testResults.passed}`);
  console.log(`❌ Failed:        ${testResults.failed}`);
  console.log(`⏭️  Skipped:       ${testResults.skipped}`);
  console.log(`Success Rate:    ${stats.successRate}%`);
  console.log(`Total Duration:  ${stats.duration.toFixed(2)}s`);
  console.log(`Avg Duration:    ${stats.avgTestDuration}s per test`);
  console.log('='.repeat(80));
}

/**
 * Main execution
 */
async function main() {
  try {
    await initializeTests();
    await runAllTests();
    
    const report = generateReport();
    saveReport(report);
    displaySummary();
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Fatal error during test execution:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test suite
main();
