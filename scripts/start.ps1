# Sous Chef Start Script
# For Windows users

Write-Host "🍳 Starting Sous Chef..." -ForegroundColor Cyan
Write-Host ""

# Check if pwa/node_modules exists
if (-not (Test-Path "pwa/node_modules")) {
    Write-Host "❌ Sous Chef hasn't been installed yet." -ForegroundColor Red
    Write-Host "   Please run .\scripts\install.ps1 first."
    exit 1
}

Write-Host "Starting development server..."
Write-Host "The app will be available at: http://localhost:5173"
Write-Host ""
Write-Host "Press Ctrl+C to stop the server."
Write-Host ""

# Run the PWA dev server
Set-Location pwa
npm run dev
