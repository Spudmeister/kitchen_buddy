#!/bin/bash
# Sous Chef Start Script
# For macOS and Linux users

echo "🍳 Starting Sous Chef..."
echo ""

# Check if built
if [ ! -d "dist" ]; then
    echo "❌ Sous Chef hasn't been built yet."
    echo "   Please run ./scripts/install.sh first."
    exit 1
fi

# Run the application
node dist/index.js "$@"
