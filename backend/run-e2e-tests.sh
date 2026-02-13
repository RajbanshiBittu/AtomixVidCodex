#!/bin/bash

# Navigate to backend directory
cd "$(dirname "$0")"

echo "🎬 Starting E2E Video Conversion Tests"
echo "======================================"
echo ""

# Check if server is running
if ! curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "❌ Error: Server is not running on http://localhost:8080"
    echo "   Please start the server first with: npm run dev"
    exit 1
fi

echo "✓ Server is running"
echo ""

# Run E2E tests
echo "Running E2E tests and generating Excel report..."
echo ""

node --experimental-vm-modules node_modules/jest/bin/jest.js tests/e2e/allConversions.test.js --verbose --runInBand

EXIT_CODE=$?

echo ""
echo "======================================"

if [ $EXIT_CODE -eq 0 ]; then
    echo "✓ Tests completed successfully!"
    echo ""
    echo "📊 Excel report generated at:"
    echo "   tests/test-results/conversion-test-report.xlsx"
else
    echo "❌ Tests failed with exit code: $EXIT_CODE"
fi

echo ""

exit $EXIT_CODE
