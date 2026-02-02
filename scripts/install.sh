#!/bin/bash
# Sous Chef Installation Script
# For macOS and Linux users

set -e

echo "🍳 Sous Chef Installer"
echo "======================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please install Node.js first:"
    echo "  1. Go to https://nodejs.org/"
    echo "  2. Download the LTS version"
    echo "  3. Run the installer"
    echo "  4. Restart your terminal"
    echo "  5. Run this script again"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required."
    echo "   Current version: $(node -v)"
    echo ""
    echo "Please update Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Install root dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Root installation failed. Please check your internet connection and try again."
    exit 1
fi

# Install PWA dependencies
echo ""
echo "📦 Installing app dependencies..."
cd pwa
npm install

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ App installation failed. Please check your internet connection and try again."
    exit 1
fi

cd ..

echo ""
echo "✅ Installation complete!"
echo ""
echo "To start Sous Chef, run:"
echo "  ./scripts/start.sh"
echo ""
echo "The app will open in your browser at http://localhost:5173"
echo ""
