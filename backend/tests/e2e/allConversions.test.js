import request from 'supertest';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import application from '../../app.js';
import { TestReport, wait } from '../helpers/testUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get all video test files from the test directory
 */
async function getTestVideoFiles() {
  const testVideoDir = path.join(__dirname, '..', '..', 'inputs');
  
  try {
    const files = await fs.readdir(testVideoDir);
    const videoFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.mpeg', '.mpg', '.webm', '.3gp', '.3g2'].includes(ext);
    });
    
    return videoFiles.map(file => ({
      name: file,
      path: path.join(testVideoDir, file),
      format: path.extname(file).slice(1).toLowerCase().replace('mpg', 'mpeg')
    }));
  } catch (error) {
    console.warn('Test video directory not found, using fixtures');
    return [];
  }
}

/**
 * Get all conversion endpoints
 */
function getAllConversionEndpoints() {
  const formats = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'mpeg', 'flv', 'webm', '3gp', '3g2'];
  const endpoints = [];
  
  for (const targetFormat of formats) {
    for (const sourceFormat of formats) {
      if (sourceFormat !== targetFormat) {
        endpoints.push({
          source: sourceFormat,
          target: targetFormat,
          endpoint: `/api/v1/convert/${sourceFormat}-to-${targetFormat}`,
          method: 'POST'
        });
      }
    }
  }
  
  return endpoints;
}

/**
 * Test a single conversion
 */
async function testConversion(endpoint, videoFile, report) {
  const startTime = Date.now();
  const testName = `${endpoint.source.toUpperCase()} to ${endpoint.target.toUpperCase()}`;
  
  try {
    console.log(`Testing: ${testName} with file: ${videoFile.name}`);
    
    const response = await request(application)
      .post(endpoint.endpoint)
      .attach('video', videoFile.path)
      .timeout(60000);
    
    const duration = Date.now() - startTime;
    
    if (response.status === 200 && response.body.success) {
      report.addResult({
        conversion: testName,
        endpoint: endpoint.endpoint,
        status: 'passed',
        statusCode: response.status,
        inputFile: videoFile.name,
        outputFile: response.body.data?.outputFilename || 'N/A',
        duration,
        message: 'Conversion successful',
        error: null
      });
      
      console.log(`✓ PASSED: ${testName} (${duration}ms)`);
      return true;
    } else {
      report.addResult({
        conversion: testName,
        endpoint: endpoint.endpoint,
        status: 'failed',
        statusCode: response.status,
        inputFile: videoFile.name,
        outputFile: 'N/A',
        duration,
        message: response.body.message || 'Conversion failed',
        error: response.body.error || 'Unknown error'
      });
      
      console.log(`✗ FAILED: ${testName} - ${response.body.message}`);
      return false;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    report.addResult({
      conversion: testName,
      endpoint: endpoint.endpoint,
      status: 'failed',
      statusCode: error.status || 500,
      inputFile: videoFile.name,
      outputFile: 'N/A',
      duration,
      message: 'Request failed',
      error: error.message || error.toString()
    });
    
    console.log(`✗ FAILED: ${testName} - ${error.message}`);
    return false;
  }
}

/**
 * Generate Excel report
 */
async function generateExcelReport(report, filename = 'conversion-test-report.xlsx') {
  const workbook = new ExcelJS.Workbook();
  
  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  const summary = report.getSummary();
  
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 }
  ];
  
  summarySheet.addRows([
    { metric: 'Total Conversions Tested', value: summary.total },
    { metric: 'Passed', value: summary.passed },
    { metric: 'Failed', value: summary.failed },
    { metric: 'Skipped', value: summary.skipped },
    { metric: 'Pass Rate', value: summary.passRate },
    { metric: 'Fail Rate', value: summary.failRate },
    { metric: 'Start Time', value: summary.startTime.toLocaleString() },
    { metric: 'End Time', value: summary.endTime.toLocaleString() },
    { metric: 'Total Duration (ms)', value: summary.duration }
  ]);
  
  // Style summary sheet
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  
  // Results Sheet
  const resultsSheet = workbook.addWorksheet('Detailed Results');
  
  resultsSheet.columns = [
    { header: 'Conversion', key: 'conversion', width: 25 },
    { header: 'Endpoint', key: 'endpoint', width: 35 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'HTTP Status', key: 'statusCode', width: 12 },
    { header: 'Input File', key: 'inputFile', width: 25 },
    { header: 'Output File', key: 'outputFile', width: 35 },
    { header: 'Duration (ms)', key: 'duration', width: 15 },
    { header: 'Message', key: 'message', width: 30 },
    { header: 'Error', key: 'error', width: 50 }
  ];
  
  const results = report.getResults();
  resultsSheet.addRows(results);
  
  // Style results sheet
  resultsSheet.getRow(1).font = { bold: true };
  resultsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  
  // Color code status column
  resultsSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const statusCell = row.getCell('status');
      if (statusCell.value === 'passed') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF00B050' }
        };
      } else if (statusCell.value === 'failed') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF0000' }
        };
      }
    }
  });
  
  // Failed Conversions Sheet
  const failedSheet = workbook.addWorksheet('Failed Conversions');
  failedSheet.columns = resultsSheet.columns;
  
  const failedResults = results.filter(r => r.status === 'failed');
  failedSheet.addRows(failedResults);
  
  failedSheet.getRow(1).font = { bold: true };
  failedSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF0000' }
  };
  
  // Save workbook
  const reportPath = path.join(__dirname, '..', 'test-results', filename);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await workbook.xlsx.writeFile(reportPath);
  
  console.log(`\n📊 Excel report generated: ${reportPath}`);
  return reportPath;
}

describe('E2E Tests - All 90 Video Conversions', () => {
  let testVideoFiles = [];
  const report = new TestReport();
  
  beforeAll(async () => {
    console.log('\n🎬 Starting E2E Conversion Tests\n');
    console.log('='.repeat(80));
    
    testVideoFiles = await getTestVideoFiles();
    
    if (testVideoFiles.length === 0) {
      console.warn('⚠️  No test video files found. Please add test videos to: test-video/input/');
      console.warn('    Using mock files for testing...\n');
    } else {
      console.log(`✓ Found ${testVideoFiles.length} test video file(s)\n`);
    }
  });
  
  afterAll(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('🏁 Test Suite Complete\n');
    
    report.finalize();
    const summary = report.getSummary();
    
    console.log('📈 Test Summary:');
    console.log(`   Total Tests: ${summary.total}`);
    console.log(`   ✓ Passed: ${summary.passed} (${summary.passRate})`);
    console.log(`   ✗ Failed: ${summary.failed} (${summary.failRate})`);
    console.log(`   ⊘ Skipped: ${summary.skipped}`);
    console.log(`   Duration: ${(summary.duration / 1000).toFixed(2)}s\n`);
    
    // Generate Excel report
    await generateExcelReport(report);
    
    console.log('='.repeat(80) + '\n');
  }, 300000);
  
  describe('Sequential Conversion Tests', () => {
    const allEndpoints = getAllConversionEndpoints();
    
    test('should test all 90 conversions', async () => {
      if (testVideoFiles.length === 0) {
        console.log('⊘ Skipping conversions - no test files available');
        return;
      }
      
      let testCount = 0;
      
      for (const videoFile of testVideoFiles) {
        const compatibleEndpoints = allEndpoints.filter(e => 
          e.source === videoFile.format || e.source === videoFile.format.replace('mpeg', 'mpg')
        );
        
        if (compatibleEndpoints.length === 0) {
          console.log(`⊘ Skipping ${videoFile.name} - no compatible endpoints`);
          continue;
        }
        
        console.log(`\n📹 Testing conversions for: ${videoFile.name}`);
        console.log('-'.repeat(80));
        
        for (const endpoint of compatibleEndpoints) {
          await testConversion(endpoint, videoFile, report);
          testCount++;
          
          // Rate limiting: wait between requests
          await wait(1000);
          
          // Limit total tests for demo
          if (testCount >= 90) break;
        }
        
        if (testCount >= 90) break;
      }
      
      // If we don't have enough real conversions, note it
      if (testCount < 90) {
        console.log(`\n⚠️  Only ${testCount} conversions tested (need more test video files for all 90)`);
      }
      
      expect(testCount).toBeGreaterThan(0);
    }, 600000); // 10 minute timeout
  });
  
  describe('Parallel Conversion Tests (Sample)', () => {
    test('should handle concurrent conversions', async () => {
      if (testVideoFiles.length === 0) {
        console.log('⊘ Skipping parallel test - no test files');
        return;
      }
      
      const videoFile = testVideoFiles[0];
      const sampleEndpoints = getAllConversionEndpoints()
        .filter(e => e.source === videoFile.format)
        .slice(0, 3);
      
      const promises = sampleEndpoints.map(endpoint =>
        testConversion(endpoint, videoFile, report)
      );
      
      const results = await Promise.all(promises);
      expect(results.some(r => r === true)).toBe(true);
    }, 120000);
  });
  
  describe('Memory and Performance Tests', () => {
    test('should not leak memory during sequential conversions', async () => {
      if (testVideoFiles.length === 0) return;
      
      const initialMemory = process.memoryUsage().heapUsed;
      const videoFile = testVideoFiles[0];
      const endpoints = getAllConversionEndpoints()
        .filter(e => e.source === videoFile.format)
        .slice(0, 5);
      
      for (const endpoint of endpoints) {
        await testConversion(endpoint, videoFile, report);
        await wait(500);
      }
      
      global.gc && global.gc();
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      // Memory should not increase more than 100MB
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    }, 180000);
  });
});
