#!/bin/bash

# Production-Ready Testing Script
# Atomix-VidCodex Video Conversion API

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Atomix-VidCodex API - Comprehensive Test Suite            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_ENV="test"
REPORT_DIR="tests/test-results"
COVERAGE_DIR="coverage"

# Check if running in backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from backend directory${NC}"
    exit 1
fi

# Create necessary directories
echo -e "${BLUE}📁 Setting up test environment...${NC}"
mkdir -p $REPORT_DIR
mkdir -p $COVERAGE_DIR
mkdir -p uploads-test
mkdir -p outputs-test
mkdir -p logs-test
echo -e "${GREEN}✓ Environment ready${NC}"
echo ""

# Check for test videos
TEST_VIDEO_DIR="../test-video/input"
if [ -d "$TEST_VIDEO_DIR" ]; then
    VIDEO_COUNT=$(find "$TEST_VIDEO_DIR" -type f \( -name "*.mp4" -o -name "*.avi" -o -name "*.mov" -o -name "*.mkv" -o -name "*.wmv" -o -name "*.flv" -o -name "*.mpeg" -o -name "*.webm" -o -name "*.3gp" -o -name "*.3g2" \) | wc -l)
    echo -e "${BLUE}📹 Found $VIDEO_COUNT test video file(s)${NC}"
else
    echo -e "${YELLOW}⚠️  Test video directory not found: $TEST_VIDEO_DIR${NC}"
    echo -e "${YELLOW}   Tests will use mock files${NC}"
fi
echo ""

# Check dependencies
echo -e "${BLUE}📦 Checking dependencies...${NC}"
if ! npm list jest > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Jest not found. Installing test dependencies...${NC}"
    npm install --save-dev @jest/globals jest supertest exceljs
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ All dependencies present${NC}"
fi
echo ""

# Run tests based on argument
TEST_TYPE="${1:-all}"

case $TEST_TYPE in
    unit)
        echo -e "${BLUE}🧪 Running Unit Tests${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        npm run test:unit
        ;;
    
    integration)
        echo -e "${BLUE}🔗 Running Integration Tests${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        npm run test:integration
        ;;
    
    e2e)
        echo -e "${BLUE}🎬 Running End-to-End Tests${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        npm run test:e2e
        ;;
    
    report)
        echo -e "${BLUE}📊 Running Full Test Suite with Report Generation${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        npm run test:report
        ;;
    
    coverage)
        echo -e "${BLUE}📈 Running Tests with Coverage${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        npm run test:coverage
        echo ""
        echo -e "${GREEN}✓ Coverage report generated${NC}"
        echo -e "${BLUE}   View at: ${NC}file://$(pwd)/$COVERAGE_DIR/lcov-report/index.html"
        ;;
    
    all|*)
        echo -e "${BLUE}🚀 Running Complete Test Suite${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        echo ""
        echo -e "${YELLOW}Phase 1/4: Unit Tests${NC}"
        npm run test:unit || echo -e "${RED}✗ Some unit tests failed${NC}"
        
        echo ""
        echo -e "${YELLOW}Phase 2/4: Integration Tests${NC}"
        npm run test:integration || echo -e "${RED}✗ Some integration tests failed${NC}"
        
        echo ""
        echo -e "${YELLOW}Phase 3/4: E2E Tests${NC}"
        npm run test:e2e || echo -e "${RED}✗ Some E2E tests failed${NC}"
        
        echo ""
        echo -e "${YELLOW}Phase 4/4: Coverage Report${NC}"
        npm run test:coverage || echo -e "${RED}✗ Coverage generation failed${NC}"
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Test execution complete${NC}"
echo ""

# Check for Excel report
if [ -f "$REPORT_DIR/conversion-test-report.xlsx" ]; then
    echo -e "${BLUE}📊 Excel Report:${NC}"
    echo "   $REPORT_DIR/conversion-test-report.xlsx"
    echo ""
fi

# Check for coverage report
if [ -d "$COVERAGE_DIR" ]; then
    echo -e "${BLUE}📈 Coverage Report:${NC}"
    echo "   $COVERAGE_DIR/lcov-report/index.html"
    echo ""
fi

# Cleanup test artifacts (optional)
read -p "Clean up test artifacts? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🧹 Cleaning up...${NC}"
    rm -rf uploads-test/* outputs-test/* logs-test/*
    echo -e "${GREEN}✓ Cleanup complete${NC}"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                     Testing Complete! 🎉                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
