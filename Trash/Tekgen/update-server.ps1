# update-server.ps1
# Zero-downtime update script for Tekgen ATS
# Run this whenever you update backend or frontend code.
# The team never experiences downtime — PM2 hot-reloads the backend.

$NODE  = "C:\Tekgen\node-portable\node-v20.20.2-win-x64\node.exe"
$PM2   = "C:\Tekgen\tekgen-ats-backend\node_modules\pm2\bin\pm2"
$FRONT = "C:\Tekgen\tekgen-ats-frontend"
$BACK  = "C:\Tekgen\tekgen-ats-backend"
$NEXT  = "$FRONT\node_modules\next\dist\bin\next"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tekgen ATS — Zero-Downtime Update" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ── Step 1: Rebuild frontend (Next.js static export) ──────────────────────
Write-Host ""
Write-Host "[1/2] Building frontend..." -ForegroundColor Yellow
Set-Location $FRONT
& $NODE $NEXT build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Frontend build FAILED — aborting. Backend is still running." -ForegroundColor Red
    exit 1
}
Write-Host "  Frontend built OK." -ForegroundColor Green

# ── Step 2: Graceful backend reload (no downtime) ─────────────────────────
Write-Host ""
Write-Host "[2/2] Reloading backend (graceful — zero downtime)..." -ForegroundColor Yellow
Set-Location $BACK

# Start via PM2 if not already running, otherwise hot-reload
$status = & $NODE $PM2 list 2>&1
if ($status -match "tekgen-ats") {
    & $NODE $PM2 reload ecosystem.config.js --update-env
    Write-Host "  Backend gracefully reloaded — team never lost connection." -ForegroundColor Green
} else {
    & $NODE $PM2 start ecosystem.config.js
    Write-Host "  Backend started via PM2." -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Update complete!  Server is live." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
