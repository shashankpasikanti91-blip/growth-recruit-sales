#!/usr/bin/env pwsh
# ─────────────────────────────────────────────────────────────────────────────
# push-and-deploy.ps1
# 1) Push local commits to GitHub using your PAT token
# 2) SCP changed files to the Hetzner server
# 3) Rebuild backend + frontend containers
# 4) Re-run seed to ensure visa rules are populated
#
# USAGE:
#   .\push-and-deploy.ps1 -Token "ghp_YOUR_GITHUB_PAT_TOKEN_HERE"
#
# ─────────────────────────────────────────────────────────────────────────────
param(
    [Parameter(Mandatory = $true)]
    [string]$Token
)

$ErrorActionPreference = "Stop"
$REPO_DIR = $PSScriptRoot
$REMOTE_REPO = "github.com/shashankpasikanti91-blip/growth-recruit-sales.git"
$SERVER = "5.223.67.236"
$SERVER_USER = "root"
$SERVER_APP = "/opt/growth-platform"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SRP AI Labs — Push + Deploy Script" -ForegroundColor Cyan
Write-Host "  $(Get-Date)" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

Set-Location $REPO_DIR

# ── STEP 1: GitHub Push ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 1: Pushing to GitHub..." -ForegroundColor Yellow

# Update remote URL with token
$AUTH_URL = "https://$Token@$REMOTE_REPO"
git remote set-url origin $AUTH_URL

# Push
git push origin master
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ GitHub push failed. Check your token and try again." -ForegroundColor Red
    # Reset URL to token-less version for safety
    git remote set-url origin "https://$REMOTE_REPO"
    exit 1
}

# Reset remote URL to token-less (don't store token in config)
git remote set-url origin "https://$REMOTE_REPO"
Write-Host "✅ Pushed to GitHub. Token removed from config." -ForegroundColor Green

# ── STEP 2: Sync code on server via git ──────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 2: Syncing code on server via git pull..." -ForegroundColor Yellow

ssh "${SERVER_USER}@${SERVER}" @"
set -e
cd ${SERVER_APP}
echo '  Fetching latest from origin...'
git fetch origin
echo '  Resetting to origin/master...'
git reset --hard origin/master
git clean -fd
echo '  Server code is now in sync with GitHub.'
"@

Write-Host "✅ Server code synced via git." -ForegroundColor Green

# ── STEP 3: Rebuild containers ────────────────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 3: Rebuilding backend + frontend containers..." -ForegroundColor Yellow

ssh "${SERVER_USER}@${SERVER}" @"
set -e
cd ${SERVER_APP}

echo '  Building backend...'
docker compose -f docker-compose.prod.yml build backend

echo '  Building frontend...'
docker compose -f docker-compose.prod.yml build frontend

echo '  Restarting services...'
docker compose -f docker-compose.prod.yml up -d backend frontend

echo '  Waiting 15s for services to start...'
sleep 15
"@

Write-Host "✅ Containers rebuilt and restarted." -ForegroundColor Green

# ── STEP 4: Run database migrations ──────────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 4: Running Prisma migrations..." -ForegroundColor Yellow

ssh "${SERVER_USER}@${SERVER}" @"
cd ${SERVER_APP}
docker exec growth_backend sh -c "npx prisma migrate deploy" 2>&1 | tail -20
"@

Write-Host "✅ Migrations applied." -ForegroundColor Green

# ── STEP 5: Run seed to populate visa rules ───────────────────────────────────
Write-Host ""
Write-Host "▶ Step 5: Running database seed (visa rules + demo data)..." -ForegroundColor Yellow

ssh "${SERVER_USER}@${SERVER}" @"
cd ${SERVER_APP}
docker exec growth_backend sh -c "npx prisma db seed" 2>&1 | tail -20
"@

Write-Host "✅ Seed complete." -ForegroundColor Green

# ── STEP 6: Verify ────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 6: Verifying services..." -ForegroundColor Yellow

ssh "${SERVER_USER}@${SERVER}" @"
echo '--- Container status ---'
docker ps --format 'table {{.Names}}\t{{.Status}}'
echo ''
echo '--- Backend health ---'
curl -sf http://127.0.0.1:8020/api/v1/health && echo 'Backend OK' || echo 'Backend not ready yet'
echo ''
echo '--- Visa rules count ---'
docker exec growth_backend sh -c "npx prisma db execute --stdin <<< 'SELECT COUNT(*) FROM visa_rules;'" 2>/dev/null || echo '(run: docker exec growth_backend node -e \"const{PrismaClient}=require(\\\"@prisma/client\\\");const p=new PrismaClient();p.visaRule.count().then(n=>console.log(n+\\\" visa rules\\\"))\")'
"@

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 https://growth.srpailabs.com" -ForegroundColor White
Write-Host "  📚 https://growth.srpailabs.com/api/v1/docs" -ForegroundColor White
Write-Host "  🔑 Credentials: see server .env" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
