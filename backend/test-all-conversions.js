import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Professional Video Conversion Test Suite
 * Tests all 90 conversions and generates detailed Excel reports
 */

const BASE_URL = 'http://localhost:8080';
const TEST_VIDEO_DIR = path.join(__dirname, 'inputs');
const REPORT_DIR = path.join(__dirname, 'tests', 'test-results');

// Format mappings
const FORMAT_EXTENSIONS = {
  'mp4': '.mp4',
  'avi': '.avi',
  'mkv': '.mkv',
  'mov': '.mov',
  'wmv': '.wmv',
  'mpeg': '.mpeg',
  'flv': '.flv',
  'webm': '.webm',
  '3gp': '.3gp',
  '3g2': '.3g2'
};

class ConversionTestSuite {
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
    this.testVideoFiles = {};
  }

  /**
   * Load test video files organized by format
   */
  async loadTestVideos() {
    console.log('📂 Loading test video files...');
    
    try {
      const files = await fs.readdir(TEST_VIDEO_DIR);
      
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        const format = ext.slice(1).replace('mpg', 'mpeg');
        
        if (Object.keys(FORMAT_EXTENSIONS).includes(format)) {
          this.testVideoFiles[format] = {
            name: file,
            path: path.join(TEST_VIDEO_DIR, file),
            format: format
          };
        }
      }
      
      console.log(`✓ Found ${Object.keys(this.testVideoFiles).length} test video formats`);
      console.log(`  Available formats: ${Object.keys(this.testVideoFiles).join(', ')}`);
      return true;
    } catch (error) {
      console.error('❌ Error loading test videos:', error.message);
      return false;
    }
  }

  /**
   * Test a single conversion
   */
  async testConversion(sourceFormat, targetFormat) {
    if (sourceFormat === targetFormat) {
      return null; // Skip self-conversion
    }

    if (!this.testVideoFiles[sourceFormat]) {
      this.stats.skipped++;
      return {
        conversion: `${sourceFormat.toUpperCase()} → ${targetFormat.toUpperCase()}`,
        endpoint: `/api/v1/convert/${sourceFormat}-to-${targetFormat}`,
        status: 'SKIPPED',
        httpStatus: 'N/A',
        inputFile: 'Not available',
        outputFile: 'N/A',
        duration: 0,
        message: `No test file for ${sourceFormat.toUpperCase()}`,
        error: ''
      };
    }

    const videoFile = this.testVideoFiles[sourceFormat];
    const endpoint = `/api/v1/convert/${sourceFormat}-to-${targetFormat}`;
    const startTime = Date.now();
    
    this.stats.total++;
    console.log(`\n[${this.stats.total}] Testing: ${sourceFormat.toUpperCase()} → ${targetFormat.toUpperCase()}`);
    
    try {
      const form = new FormData();
      const fileBuffer = await fs.readFile(videoFile.path);
      form.append('video', fileBuffer, {
        filename: videoFile.name,
        contentType: `video/${sourceFormat}`
      });

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        body: form,
        timeout: 90000
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      const result = {
        conversion: `${sourceFormat.toUpperCase()} → ${targetFormat.toUpperCase()}`,
        endpoint: endpoint,
        status: response.ok ? 'PASSED' : 'FAILED',
        httpStatus: response.status,
        inputFile: videoFile.name,
        outputFile: data.data?.outputFilename || data.outputFilename || 'N/A',
        duration: duration,
        message: data.message || '',
        error: data.error || response.statusText || ''
      };

      this.results.push(result);
      
      if (response.ok) {
        this.stats.passed++;
        console.log(`   ✓ PASSED in ${(duration / 1000).toFixed(2)}s`);
      } else {
        this.stats.failed++;
        console.log(`   ✗ FAILED: ${data.error || data.message || 'Unknown error'}`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const result = {
        conversion: `${sourceFormat.toUpperCase()} → ${targetFormat.toUpperCase()}`,
        endpoint: endpoint,
        status: 'FAILED',
        httpStatus: 'ERROR',
        inputFile: videoFile.name,
        outputFile: 'N/A',
        duration: duration,
        message: 'Request failed',
        error: error.message || error.toString()
      };

      this.results.push(result);
      this.stats.failed++;
      console.log(`   ✗ FAILED: ${error.message}`);
      
      return result;
    }
  }

  /**
   * Test all possible conversions
   */
  async runAllConversions() {
    console.log('\n🎬 Starting Comprehensive Conversion Tests');
    console.log('═'.repeat(80));
    
    this.stats.startTime = new Date();
    
    const formats = Object.keys(FORMAT_EXTENSIONS);
    
    for (const sourceFormat of formats) {
      if (!this.testVideoFiles[sourceFormat]) {
        console.log(`\n⊘ Skipping ${sourceFormat.toUpperCase()} conversions (no test file)`);
        continue;
      }
      
      console.log(`\n📹 Testing ${sourceFormat.toUpperCase()} conversions:`);
      console.log('─'.repeat(80));
      
      for (const targetFormat of formats) {
        if (sourceFormat !== targetFormat) {
          await this.testConversion(sourceFormat, targetFormat);
          
          // Rate limiting: wait 1 second between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    this.stats.endTime = new Date();
    
    console.log('\n' + '═'.repeat(80));
    console.log('🏁 Test Suite Completed');
    console.log('═'.repeat(80));
  }

  /**
   * Generate comprehensive Excel report
   */
  async generateExcelReport() {
    console.log('\n📊 Generating Excel Report...');
    
    const workbook = new ExcelJS.Workbook();
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `conversion-test-report-${timestamp}.xlsx`;
    
    // ============================================================
    // SHEET 1: Executive Summary
    // ============================================================
    const summarySheet = workbook.addWorksheet('Executive Summary');
    
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 35 },
      { header: 'Value', key: 'value', width: 25 }
    ];
    
    const totalDuration = this.stats.endTime - this.stats.startTime;
    const passRate = this.stats.total > 0 
      ? ((this.stats.passed / this.stats.total) * 100).toFixed(2) + '%'
      : '0%';
    const failRate = this.stats.total > 0 
      ? ((this.stats.failed / this.stats.total) * 100).toFixed(2) + '%'
      : '0%';
    
    summarySheet.addRows([
      { metric: 'Report Generated', value: new Date().toLocaleString() },
      { metric: '', value: '' },
      { metric: '📈 Test Statistics', value: '' },
      { metric: 'Total Conversions Tested', value: this.stats.total },
      { metric: '✓ Passed', value: this.stats.passed },
      { metric: '✗ Failed', value: this.stats.failed },
      { metric: '⊘ Skipped', value: this.stats.skipped },
      { metric: 'Pass Rate', value: passRate },
      { metric: 'Fail Rate', value: failRate },
      { metric: '', value: '' },
      { metric: '⏱️ Timing', value: '' },
      { metric: 'Start Time', value: this.stats.startTime.toLocaleString() },
      { metric: 'End Time', value: this.stats.endTime.toLocaleString() },
      { metric: 'Total Duration', value: `${(totalDuration / 1000 / 60).toFixed(2)} minutes` },
      { metric: 'Average per Conversion', value: `${(totalDuration / this.stats.total / 1000).toFixed(2)}s` },
      { metric: '', value: '' },
      { metric: '📁 Test Files', value: '' },
      { metric: 'Test Video Formats', value: Object.keys(this.testVideoFiles).length },
      { metric: 'Available Formats', value: Object.keys(this.testVideoFiles).join(', ') }
    ]);
    
    // Style summary sheet header
    summarySheet.getRow(1).font = { bold: true, size: 12 };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    summarySheet.getRow(1).font = { ...summarySheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };
    
    // Style section headers
    [3, 11, 17].forEach(rowNum => {
      const row = summarySheet.getRow(rowNum);
      row.font = { bold: true, size: 11 };
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE7E6E6' }
      };
    });
    
    // ============================================================
    // SHEET 2: Detailed Results
    // ============================================================
    const resultsSheet = workbook.addWorksheet('All Conversions');
    
    resultsSheet.columns = [
      { header: '#', key: 'index', width: 5 },
      { header: 'Conversion', key: 'conversion', width: 22 },
      { header: 'Endpoint', key: 'endpoint', width: 38 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'HTTP Status', key: 'httpStatus', width: 12 },
      { header: 'Input File', key: 'inputFile', width: 30 },
      { header: 'Output File', key: 'outputFile', width: 45 },
      { header: 'Duration (ms)', key: 'duration', width: 15 },
      { header: 'Message', key: 'message', width: 35 },
      { header: 'Error Details', key: 'error', width: 50 }
    ];
    
    // Add data with index
    this.results.forEach((result, index) => {
      resultsSheet.addRow({
        index: index + 1,
        ...result
      });
    });
    
    // Style header row
    resultsSheet.getRow(1).font = { bold: true, size: 11 };
    resultsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    resultsSheet.getRow(1).font = { ...resultsSheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };
    
    // Color code status column
    resultsSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const statusCell = row.getCell('status');
        if (statusCell.value === 'PASSED') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF00B050' }
          };
          statusCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        } else if (statusCell.value === 'FAILED') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF0000' }
          };
          statusCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        } else if (statusCell.value === 'SKIPPED') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC000' }
          };
          statusCell.font = { bold: true };
        }
      }
    });
    
    // Auto-filter
    resultsSheet.autoFilter = {
      from: 'A1',
      to: 'J1'
    };
    
    // ============================================================
    // SHEET 3: Failed Conversions Only
    // ============================================================
    const failedSheet = workbook.addWorksheet('Failed Conversions');
    failedSheet.columns = resultsSheet.columns;
    
    const failedResults = this.results.filter(r => r.status === 'FAILED');
    failedResults.forEach((result, index) => {
      failedSheet.addRow({
        index: index + 1,
        ...result
      });
    });
    
    // Style header
    failedSheet.getRow(1).font = { bold: true, size: 11 };
    failedSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF0000' }
    };
    failedSheet.getRow(1).font = { ...failedSheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };
    
    // Auto-filter
    if (failedResults.length > 0) {
      failedSheet.autoFilter = {
        from: 'A1',
        to: 'J1'
      };
    }
    
    // ============================================================
    // SHEET 4: Conversion Matrix
    // ============================================================
    const matrixSheet = workbook.addWorksheet('Conversion Matrix');
    
    const formats = Object.keys(FORMAT_EXTENSIONS);
    
    // Create header row
    const headerRow = ['From \\ To', ...formats.map(f => f.toUpperCase())];
    matrixSheet.addRow(headerRow);
    
    // Create matrix data
    for (const sourceFormat of formats) {
      const row = [sourceFormat.toUpperCase()];
      
      for (const targetFormat of formats) {
        if (sourceFormat === targetFormat) {
          row.push('—');
        } else {
          const result = this.results.find(
            r => r.conversion === `${sourceFormat.toUpperCase()} → ${targetFormat.toUpperCase()}`
          );
          row.push(result ? result.status : 'N/A');
        }
      }
      
      matrixSheet.addRow(row);
    }
    
    // Style header
    matrixSheet.getRow(1).font = { bold: true };
    matrixSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    matrixSheet.getRow(1).font = { ...matrixSheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };
    
    // Style first column
    matrixSheet.getColumn(1).font = { bold: true };
    matrixSheet.getColumn(1).width = 15;
    
    // Color code cells
    matrixSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell, colNumber) => {
          if (colNumber > 1) {
            if (cell.value === 'PASSED') {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF00B050' }
              };
              cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            } else if (cell.value === 'FAILED') {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFF0000' }
              };
              cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            } else if (cell.value === 'SKIPPED') {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFC000' }
              };
            }
          }
        });
      }
    });
    
    // Set column widths for matrix
    formats.forEach((_, index) => {
      matrixSheet.getColumn(index + 2).width = 10;
    });
    
    // ============================================================
    // Save workbook
    // ============================================================
    await fs.mkdir(REPORT_DIR, { recursive: true });
    const reportPath = path.join(REPORT_DIR, filename);
    await workbook.xlsx.writeFile(reportPath);
    
    console.log(`✓ Excel report generated successfully!`);
    console.log(`  📄 Location: ${reportPath}`);
    console.log(`  📊 Sheets: Executive Summary, All Conversions, Failed Conversions, Conversion Matrix`);
    
    return reportPath;
  }

  /**
   * Print summary to console
   */
  printSummary() {
    console.log('\n' + '═'.repeat(80));
    console.log('📈 TEST SUMMARY');
    console.log('═'.repeat(80));
    
    const totalDuration = this.stats.endTime - this.stats.startTime;
    const passRate = this.stats.total > 0 
      ? ((this.stats.passed / this.stats.total) * 100).toFixed(2)
      : '0';
    
    console.log(`\n✓ Total Tests:        ${this.stats.total}`);
    console.log(`✓ Passed:             ${this.stats.passed} (${passRate}%)`);
    console.log(`✗ Failed:             ${this.stats.failed}`);
    console.log(`⊘ Skipped:            ${this.stats.skipped}`);
    console.log(`⏱️ Duration:           ${(totalDuration / 1000 / 60).toFixed(2)} minutes`);
    console.log(`⏱️ Avg per Test:       ${(totalDuration / this.stats.total / 1000).toFixed(2)}s`);
    
    console.log('\n' + '═'.repeat(80));
  }
}

// ============================================================
// Main Execution
// ============================================================
async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('🎬 VIDEO CONVERSION TEST SUITE');
  console.log('   Professional Excel Reporting for All 90 Conversions');
  console.log('═'.repeat(80));
  
  // Check if server is running
  try {
    const response = await fetch(`${BASE_URL}/api/v1/convert/mp4-to-avi`, {
      method: 'GET',
      timeout: 5000
    });
    console.log('✓ Server is accessible at', BASE_URL);
  } catch (error) {
    console.error('\n❌ ERROR: Server is not running!');
    console.error('   Please start the server first: npm run dev');
    console.error('   Server should be running on:', BASE_URL);
    process.exit(1);
  }
  
  const suite = new ConversionTestSuite();
  
  // Load test videos
  const videosLoaded = await suite.loadTestVideos();
  if (!videosLoaded || Object.keys(suite.testVideoFiles).length === 0) {
    console.error('\n❌ ERROR: No test video files found!');
    console.error(`   Please add test videos to: ${TEST_VIDEO_DIR}`);
    console.error('   Required formats: mp4, avi, mkv, mov, wmv, mpeg, flv, webm, 3gp, 3g2');
    process.exit(1);
  }
  
  // Run all conversions
  await suite.runAllConversions();
  
  // Print summary
  suite.printSummary();
  
  // Generate Excel report
  await suite.generateExcelReport();
  
  console.log('\n✅ Testing complete!\n');
  
  process.exit(0);
}

// Run the test suite
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
