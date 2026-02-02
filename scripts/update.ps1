# Sous Chef Update Script
# For Windows users (PowerShell)

Write-Host "🍳 Updating Sous Chef..." -ForegroundColor Cyan
Write-Host ""

# Update dependencies
Write-Host "📦 Updating dependencies..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Update failed." -ForegroundColor Red
    exit 1
}

# Rebuild
Write-Host "🔨 Rebuilding..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Update complete!" -ForegroundColor Green
Write-Host ""
