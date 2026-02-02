# Sous Chef Installation Script
# For Windows users

Write-Host "🍳 Sous Chef Installer" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

# Check for Node.js
try {
    $nodeVersion = node -v
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    
    if ($versionNumber -lt 18) {
        Write-Host "❌ Node.js version 18 or higher is required." -ForegroundColor Red
        Write-Host "   Current version: $nodeVersion"
        Write-Host ""
        Write-Host "Please update Node.js from https://nodejs.org/"
        exit 1
    }
    
    Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js first:"
    Write-Host "  1. Go to https://nodejs.org/"
    Write-Host "  2. Download the LTS version"
    Write-Host "  3. Run the installer"
    Write-Host "  4. Restart PowerShell"
    Write-Host "  5. Run this script again"
    exit 1
}

Write-Host ""

# Install root dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Root installation failed. Please check your internet connection and try again." -ForegroundColor Red
    exit 1
}

# Install PWA dependencies
Write-Host ""
Write-Host "📦 Installing app dependencies..." -ForegroundColor Yellow
Set-Location pwa
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ App installation failed. Please check your internet connection and try again." -ForegroundColor Red
    exit 1
}

# Copy sql.js WASM file to public folder
Write-Host ""
Write-Host "📋 Setting up database files..." -ForegroundColor Yellow
Copy-Item "node_modules/sql.js/dist/sql-wasm.wasm" -Destination "public/"
Copy-Item "node_modules/sql.js/dist/sql-wasm.js" -Destination "public/"

Set-Location ..

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start Sous Chef, run:"
Write-Host "  .\scripts\start.ps1"
Write-Host ""
Write-Host "The app will open in your browser at http://localhost:5173"
Write-Host ""
