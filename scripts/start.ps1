# Sous Chef Start Script
# For Windows users (PowerShell)

Write-Host "🍳 Starting Sous Chef..." -ForegroundColor Cyan
Write-Host ""

# Check if built
if (-not (Test-Path "dist")) {
    Write-Host "❌ Sous Chef hasn't been built yet." -ForegroundColor Red
    Write-Host "   Please run .\scripts\install.ps1 first." -ForegroundColor Yellow
    exit 1
}

# Run the application
node dist/index.js $args
