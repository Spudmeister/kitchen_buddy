#!/bin/bash
# Sous Chef Update Script
# For macOS and Linux users

set -e

echo "🍳 Updating Sous Chef..."
echo ""

# Update dependencies
echo "📦 Updating dependencies..."
npm install

# Rebuild
echo "🔨 Rebuilding..."
npm run build

echo ""
echo "✅ Update complete!"
echo ""
