import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Quick Test Runner for All 90 Conversions
 * This script performs actual API tests and generates an Excel report
 */

const BASE_URL = 'http://localhost:8080';
const TEST_VIDEO_DIR = path.join(__dirname, 'inputs');
const REPORT_DIR = path.join(__dirname, 'tests', 'test-results');

// All possible conversions
const formats = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'mpeg', 'flv', 'webm', '3gp', '3g2'];

class ConversionTester {
  constructor() {
    this.results = [];
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
      endTime: null
    };
  }

  async getTestFiles() {
    try {
      const files = await fs.readdir(TEST_VIDEO_DIR);
      return files
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.mpeg', '.mpg', '.webm', '.3gp', '.3g2'].includes(ext);
        })
        .map(file => ({
          name: file,
          path: path.join(TEST_VIDEO_DIR, file),
          format: path.extname(file).slice(1).toLowerCase().replace('mpg', 'mpeg')
        }));
    } catch (error) {
      console.error('Could not access test video directory:', error.message);
      return [];
    }
  }

  async testConversion(sourceFormat, targetFormat, videoFile) {
    if (sourceFormat === targetFormat) {
      return null; // Skip self-conversions
    }

    const endpoint = `${BASE_URL}/api/v1/convert/${sourceFormat}-to-${targetFormat}`;
    const startTime = Date.now();
    
    try {
      console.log(`Testing: ${sourceFormat.toUpperCase()} → ${targetFormat.toUpperCase()}`);
      
      const FormData = (await import('form-data')).default;
      const fetch = (await import('node-fetch')).default;
      
      const form = new FormData();
      const fileStream = await fs.readFile(videoFile.path);
      form.append('video', fileStream, {
        filename: videoFile.name,
        contentType: `video/${sourceFormat}`
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        body: form,
        timeout: 60000
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      const result = {
        conversion: `${sourceFormat.toUpperCase()} to ${targetFormat.toUpperCase()}`,
        endpoint,
        status: response.ok ? 'PASSED' : 'FAILED',
        httpStatus: response.status,
        inputFile: videoFile.name,
        outputFile: data.data?.outputFilename || 'N/A',
        duration: `${duration}ms`,
        message: data.message || '',
        error: data.error || ''
      };

      this.results.push(result);
      
      if (response.ok) {
        this.stats.passed++;
        console.log(`  ✓ PASSED (${duration}ms)`);
      } else {
        this.stats.failed++;
        console.log(`  ✗ FAILED - ${data.message}`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result = {
        conversion: `${sourceFormat.toUpperCase()} to ${targetFormat.toUpperCase()}`,
        endpoint,
        status: 'FAILED',
        httpStatus: 500,
        inputFile: videoFile.name,
        outputFile: 'N/A',
        duration: `${duration}ms`,
        message: 'Request failed',
        error: error.message
      };

      this.results.push(result);
      this.stats.failed++;
      console.log(`  ✗ FAILED - ${error.message}`);
      return result;
    }
  }

  async generateExcelReport() {
    const workbook = new ExcelJS.Workbook();
    
    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    const duration = this.stats.endTime - this.stats.startTime;
    const passRate = ((this.stats.passed / this.stats.total) * 100).toFixed(2);
    const failRate = ((this.stats.failed / this.stats.total) * 100).toFixed(2);

    summarySheet.addRows([
      { metric: 'Total Conversions Tested', value: this.stats.total },
      { metric: 'Passed', value: this.stats.passed },
      { metric: 'Failed', value: this.stats.failed },
      { metric: 'Skipped', value: this.stats.skipped },
      { metric: 'Pass Rate', value: `${passRate}%` },
      { metric: 'Fail Rate', value: `${failRate}%` },
      { metric: 'Start Time', value: new Date(this.stats.startTime).toLocaleString() },
      { metric: 'End Time', value: new Date(this.stats.endTime).toLocaleString() },
      { metric: 'Total Duration', value: `${(duration / 1000).toFixed(2)}s` }
    ]);

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };

    // Results Sheet
    const resultsSheet = workbook.addWorksheet('All Results');
    resultsSheet.columns = [
      { header: 'Conversion', key: 'conversion', width: 25 },
      { header: 'Endpoint', key: 'endpoint', width: 40 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'HTTP Status', key: 'httpStatus', width: 12 },
      { header: 'Input File', key: 'inputFile', width: 25 },
      { header: 'Output File', key: 'outputFile', width: 40 },
      { header: 'Duration', key: 'duration', width: 15 },
      { header: 'Message', key: 'message', width: 30 },
      { header: 'Error', key: 'error', width: 50 }
    ];

    resultsSheet.addRows(this.results);
    
    resultsSheet.getRow(1).font = { bold: true };
    resultsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };

    // Color code status
    resultsSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const statusCell = row.getCell('status');
        if (statusCell.value === 'PASSED') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF00B050' }
          };
        } else if (statusCell.value === 'FAILED') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF0000' }
          };
        }
      }
    });

    // Failed Conversions Sheet
    const failedSheet = workbook.addWorksheet('Failed Only');
    failedSheet.columns = resultsSheet.columns;
    const failedResults = this.results.filter(r => r.status === 'FAILED');
    failedSheet.addRows(failedResults);
    
    failedSheet.getRow(1).font = { bold: true };
    failedSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF0000' }
    };

    // Save report
    await fs.mkdir(REPORT_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `conversion-test-report-${timestamp}.xlsx`;
    const filepath = path.join(REPORT_DIR, filename);
    
    await workbook.xlsx.writeFile(filepath);
    console.log(`\n📊 Excel report saved: ${filepath}`);
    
    return filepath;
  }

  async run() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║   Atomix-VidCodex - 90 Conversions Test Suite                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    this.stats.startTime = Date.now();

    // Get test files
    const testFiles = await this.getTestFiles();
    
    if (testFiles.length === 0) {
      console.error('❌ No test video files found!');
      console.log('   Please add test videos to: ' + TEST_VIDEO_DIR);
      return;
    }

    console.log(`✓ Found ${testFiles.length} test video file(s)\n`);
    console.log('═'.repeat(70) + '\n');

    // Run tests for each file
    for (const videoFile of testFiles) {
      console.log(`\n📹 Testing: ${videoFile.name}`);
      console.log('─'.repeat(70));
      
      // Test all conversions from this format
      for (const targetFormat of formats) {
        if (videoFile.format !== targetFormat) {
          await this.testConversion(videoFile.format, targetFormat, videoFile);
          this.stats.total++;
          
          // Add delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          this.stats.skipped++;
        }
      }
    }

    this.stats.endTime = Date.now();

    // Print summary
    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 TEST SUMMARY');
    console.log('─'.repeat(70));
    console.log(`Total Tests:    ${this.stats.total}`);
    console.log(`✓ Passed:       ${this.stats.passed}`);
    console.log(`✗ Failed:       ${this.stats.failed}`);
    console.log(`⊘ Skipped:      ${this.stats.skipped}`);
    console.log(`Pass Rate:      ${((this.stats.passed / this.stats.total) * 100).toFixed(2)}%`);
    console.log(`Duration:       ${((this.stats.endTime - this.stats.startTime) / 1000).toFixed(2)}s`);
    console.log('═'.repeat(70) + '\n');

    // Generate Excel report
    await this.generateExcelReport();
    
    console.log('\n✨ Testing complete!\n');
  }
}

// Run tests
const tester = new ConversionTester();
tester.run().catch(console.error);
