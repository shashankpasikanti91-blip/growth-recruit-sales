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
Write-Host "  RecruiSales AI — Push + Deploy Script" -ForegroundColor Cyan
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

# ── STEP 2: SCP files to server ──────────────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 2: Uploading changed files to server..." -ForegroundColor Yellow

$files = @(
    # Backend fixes
    @{ local = "backend\src\modules\ai\ai.controller.ts";    remote = "backend/src/modules/ai/ai.controller.ts" },
    # Frontend fixes
    @{ local = "frontend\src\lib\api-client.ts";             remote = "frontend/src/lib/api-client.ts" },
    @{ local = "frontend\src\app\(dashboard)\imports\page.tsx"; remote = "frontend/src/app/(dashboard)/imports/page.tsx" },
    # Other files from this session
    @{ local = "frontend\src\app\(dashboard)\ai\screen\page.tsx"; remote = "frontend/src/app/(dashboard)/ai/screen/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\billing\page.tsx"; remote = "frontend/src/app/(dashboard)/billing/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\candidates\[id]\page.tsx"; remote = "frontend/src/app/(dashboard)/candidates/[id]/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\companies\page.tsx"; remote = "frontend/src/app/(dashboard)/companies/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\dashboard\page.tsx"; remote = "frontend/src/app/(dashboard)/dashboard/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\jobs\page.tsx"; remote = "frontend/src/app/(dashboard)/jobs/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\leads\page.tsx"; remote = "frontend/src/app/(dashboard)/leads/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\settings\page.tsx"; remote = "frontend/src/app/(dashboard)/settings/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\visa-guide\page.tsx"; remote = "frontend/src/app/(dashboard)/visa-guide/page.tsx" },
    @{ local = "backend\prisma\seed.ts"; remote = "backend/prisma/seed.ts" },
    @{ local = "readme.md"; remote = "readme.md" }
)

# New files (need directory creation)
$newFiles = @(
    @{ local = "frontend\src\app\(dashboard)\jobs\[id]\page.tsx"; remote = "frontend/src/app/(dashboard)/jobs/[id]/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\leads\[id]\page.tsx"; remote = "frontend/src/app/(dashboard)/leads/[id]/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\leads\new\page.tsx"; remote = "frontend/src/app/(dashboard)/leads/new/page.tsx" }
)

# Create new directories on server
Write-Host "  Creating new directories on server..."
ssh "${SERVER_USER}@${SERVER}" @"
mkdir -p ${SERVER_APP}/frontend/src/app/\(dashboard\)/jobs/\[id\]
mkdir -p ${SERVER_APP}/frontend/src/app/\(dashboard\)/leads/\[id\]
mkdir -p ${SERVER_APP}/frontend/src/app/\(dashboard\)/leads/new
"@

# SCP all files
foreach ($f in ($files + $newFiles)) {
    $localPath = Join-Path $REPO_DIR $f.local
    $remotePath = "${SERVER_USER}@${SERVER}:${SERVER_APP}/$($f.remote)"
    Write-Host "  → $($f.remote)"
    scp "$localPath" "$remotePath"
}

Write-Host "✅ All files uploaded to server." -ForegroundColor Green

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

# ── STEP 4: Run seed to populate visa rules ───────────────────────────────────
Write-Host ""
Write-Host "▶ Step 4: Running database seed (visa rules + demo data)..." -ForegroundColor Yellow

ssh "${SERVER_USER}@${SERVER}" @"
cd ${SERVER_APP}
docker exec growth_backend sh -c "npx prisma db seed" 2>&1 | tail -20
"@

Write-Host "✅ Seed complete." -ForegroundColor Green

# ── STEP 5: Verify ────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 5: Verifying services..." -ForegroundColor Yellow

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
Write-Host "  📚 https://growth.srpailabs.com/api/docs" -ForegroundColor White
Write-Host "  🔑 admin@srp-ai-labs.com / Admin@123" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
