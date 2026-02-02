#!/bin/bash
# Sous Chef Smoke Test Script

set -e

echo "🧪 Running Sous Chef Smoke Tests..."

# 1. Run engine integration tests
echo "📦 Running engine integration tests..."
npm test tests/integration/full-journey.test.ts

# 2. Run PWA smoke test
echo "📱 Running PWA smoke test..."
cd pwa && npm test tests/smoke.test.ts

echo "✅ Smoke tests passed!"
