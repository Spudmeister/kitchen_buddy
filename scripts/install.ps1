# Sous Chef Installation Script
# For Windows users (PowerShell)

Write-Host "🍳 Sous Chef Installer" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

# Check for Node.js
try {
    $nodeVersion = node -v
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    
    if ($versionNumber -lt 18) {
        Write-Host "❌ Node.js version 18 or higher is required." -ForegroundColor Red
        Write-Host "   Current version: $nodeVersion" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Please update Node.js from https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js first:" -ForegroundColor Yellow
    Write-Host "  1. Go to https://nodejs.org/"
    Write-Host "  2. Download the LTS version"
    Write-Host "  3. Run the installer"
    Write-Host "  4. Restart PowerShell"
    Write-Host "  5. Run this script again"
    exit 1
}

Write-Host ""

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Installation failed. Please check your internet connection and try again." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Build the project
Write-Host "🔨 Building Sous Chef..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Build failed. Please report this issue." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start Sous Chef, run:" -ForegroundColor Cyan
Write-Host "  .\scripts\start.ps1"
Write-Host ""
