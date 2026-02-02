#!/bin/bash
# Sous Chef Start Script
# For macOS and Linux users

echo "🍳 Starting Sous Chef..."
echo ""

# Check if pwa/node_modules exists
if [ ! -d "pwa/node_modules" ]; then
    echo "❌ Sous Chef hasn't been installed yet."
    echo "   Please run ./scripts/install.sh first."
    exit 1
fi

echo "Starting development server..."
echo "The app will be available at: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop the server."
echo ""

# Run the PWA dev server
cd pwa
npm run dev
