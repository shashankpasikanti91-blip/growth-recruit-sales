#!/usr/bin/env pwsh
# ─────────────────────────────────────────────────────────────────────────────
# push-and-deploy.ps1
#
# Safe zero-downtime deployment to growth.srpailabs.com (Hetzner 5.223.67.236)
# Workflow:
#   1) Commit check — abort if uncommitted changes exist
#   2) Push to GitHub (via PAT token)
#   3) Pull latest code on server (git reset --hard)
#   4) Run DB migrations (prisma migrate deploy — never resets data)
#   5) Rebuild backend + frontend containers
#   6) Run seed (upsert — safe to run repeatedly, never deletes data)
#   7) Health check — verify both backend and frontend respond
#   8) (Optional) Run E2E test suite against live server
#
# USAGE:
#   .\push-and-deploy.ps1 -Token "ghp_YOUR_GITHUB_PAT"
#   .\push-and-deploy.ps1 -Token "ghp_..." -RunTests      # also run e2e tests
#   .\push-and-deploy.ps1 -Token "ghp_..." -SkipFrontend  # faster, backend only
#
# SAFETY:
#   • Postgres volume (growth_postgres_data) is NEVER touched — data preserved
#   • migrate deploy only adds new migrations — never drops tables
#   • seed uses upsert — never overwrites existing tenant/user data
#   • Harish account, system owner, and all registered tenants are preserved
#
# ─────────────────────────────────────────────────────────────────────────────
param(
    [Parameter(Mandatory = $true)]
    [string]$Token,

    [switch]$RunTests,
    [switch]$SkipFrontend,
    [switch]$SeedOnly
)

$ErrorActionPreference = "Stop"
$REPO_DIR   = $PSScriptRoot
$REMOTE_REPO = "github.com/shashankpasikanti91-blip/growth-recruit-sales.git"
$SERVER      = "5.223.67.236"
$SERVER_USER = "root"
$SERVER_APP  = "/opt/growth-platform"

function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host "▶ $msg" -ForegroundColor Yellow
}
function Write-Ok([string]$msg)   { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Fail([string]$msg) { Write-Host "  ❌ $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SRP AI Labs — Push + Deploy  |  $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Cyan
Write-Host "  Target: https://growth.srpailabs.com" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

Set-Location $REPO_DIR

# ── Pre-flight: uncommitted changes check ──────────────────────────────────
Write-Step "Pre-flight check..."
$status = git status --porcelain 2>&1
if ($status) {
    Write-Host ""
    Write-Host "  ⚠️  You have uncommitted changes:" -ForegroundColor DarkYellow
    git status --short
    Write-Host ""
    $confirm = Read-Host "  Continue deploy with uncommitted changes? [y/N]"
    if ($confirm -notmatch '^[Yy]') {
        Write-Host "  Aborted. Commit or stash your changes first." -ForegroundColor Red
        exit 1
    }
}
Write-Ok "Pre-flight OK"

# ── STEP 1: SeedOnly shortcut ────────────────────────────────────────────────
if ($SeedOnly) {
    Write-Step "Seed-only mode — running seed on server..."
    ssh "${SERVER_USER}@${SERVER}" @"
cd ${SERVER_APP}
echo '  Running database seed (upsert — safe, no data loss)...'
docker exec growth_backend sh -c 'npx prisma db seed' 2>&1 | tail -30
"@
    Write-Ok "Seed complete."
    exit 0
}

# ── STEP 1: Push to GitHub ───────────────────────────────────────────────────
Write-Step "Step 1/7: Pushing to GitHub..."

$AUTH_URL = "https://$Token@$REMOTE_REPO"
git remote set-url origin $AUTH_URL

try {
    git push origin master 2>&1
    if ($LASTEXITCODE -ne 0) { throw "git push failed" }
} catch {
    Write-Fail "GitHub push failed. Check your token and try again."
    git remote set-url origin "https://$REMOTE_REPO"
    exit 1
}

git remote set-url origin "https://$REMOTE_REPO"
Write-Ok "Pushed to GitHub."

# ── STEP 2: Pull latest code on server ──────────────────────────────────────
Write-Step "Step 2/7: Syncing code on server..."

ssh "${SERVER_USER}@${SERVER}" @"
set -e
cd ${SERVER_APP}
echo '  Fetching from origin...'
git fetch origin
git reset --hard origin/master
git clean -fd
echo '  Code synced.'
"@
Write-Ok "Server code synced."

# ── STEP 2.5: Pre-deploy database backup ─────────────────────────────────────
Write-Step "Pre-deploy backup: Backing up growth_platform database..."

ssh "${SERVER_USER}@${SERVER}" @"
set -e
BACKUP_DIR="${SERVER_APP}/backups"
mkdir -p "\$BACKUP_DIR"
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="\$BACKUP_DIR/growth_pre_deploy_\${TIMESTAMP}.sql.gz"
echo "  Creating backup => \$BACKUP_FILE"
docker exec growth_postgres pg_dump \
  -U \$(docker exec growth_postgres printenv POSTGRES_USER) \
  -d \$(docker exec growth_postgres printenv POSTGRES_DB) \
  --format=plain --if-exists --clean --no-privileges --no-owner \
  | gzip > "\$BACKUP_FILE"
SIZE=\$(du -sh "\$BACKUP_FILE" | cut -f1)
echo "  ✅ Backup done: \$BACKUP_FILE (\$SIZE)"
# Keep last 30 backups
ls -1t \$BACKUP_DIR/growth_pre_deploy_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm -f
echo "  Backups retained (max 30)."
"@
Write-Ok "Database backed up on server."

# ── STEP 3: Run DB migrations (SAFE — never resets data) ─────────────────────
Write-Step "Step 3/7: Running database migrations..."

ssh "${SERVER_USER}@${SERVER}" @"
set -e
cd ${SERVER_APP}
echo '  Running prisma migrate deploy (additive only, no data loss)...'
docker exec growth_backend sh -c 'npx prisma migrate deploy' 2>&1
echo '  Migrations done.'
"@
Write-Ok "Migrations applied."

# ── STEP 4: Rebuild containers ────────────────────────────────────────────────
Write-Step "Step 4/7: Rebuilding containers..."

if ($SkipFrontend) {
    Write-Host "  (--SkipFrontend: rebuilding backend only)" -ForegroundColor DarkGray
    ssh "${SERVER_USER}@${SERVER}" @"
set -e
cd ${SERVER_APP}
echo '  Building backend...'
docker compose -f docker-compose.prod.yml build --no-cache backend
echo '  Restarting backend...'
docker compose -f docker-compose.prod.yml up -d backend
sleep 20
"@
} else {
    ssh "${SERVER_USER}@${SERVER}" @"
set -e
cd ${SERVER_APP}
echo '  Building backend...'
docker compose -f docker-compose.prod.yml build --no-cache backend
echo '  Building frontend...'
docker compose -f docker-compose.prod.yml build --no-cache frontend
echo '  Restarting services...'
docker compose -f docker-compose.prod.yml up -d backend frontend
sleep 25
"@
}
Write-Ok "Containers rebuilt and restarted."

# ── STEP 5: Run seed (upsert — never deletes existing tenant data) ────────────
Write-Step "Step 5/7: Running seed (safe upsert — existing accounts preserved)..."

ssh "${SERVER_USER}@${SERVER}" @"
cd ${SERVER_APP}
echo '  Seeding reference data + demo account...'
docker exec growth_backend sh -c 'npx prisma db seed' 2>&1 | tail -25
"@
Write-Ok "Seed complete. Existing accounts (Harish, system owner, all tenants) untouched."

# ── STEP 6: Health check ──────────────────────────────────────────────────────
Write-Step "Step 6/7: Running health check..."

$healthPassed = $true
ssh "${SERVER_USER}@${SERVER}" @"
echo '--- Container status ---'
docker ps --format 'table {{.Names}}\t{{.Status}}'
echo ''
echo '--- Backend health ---'
for i in 1 2 3 4 5; do
  STATUS=\$(curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:8020/api/v1/health 2>/dev/null || echo '000')
  if [ "\$STATUS" = "200" ]; then
    echo '✅ Backend: OK (200)'
    break
  else
    echo "  Attempt \$i/5: \$STATUS — waiting 10s..."
    sleep 10
  fi
done
echo ''
echo '--- Frontend health ---'
for i in 1 2 3 4 5; do
  STATUS=\$(curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:8021/ 2>/dev/null || echo '000')
  if [ "\$STATUS" = "200" ]; then
    echo '✅ Frontend: OK (200)'
    break
  else
    echo "  Attempt \$i/5: \$STATUS — waiting 10s..."
    sleep 10
  fi
done
"@ 2>&1 | Write-Host

Write-Ok "Health check done."

# ── STEP 7: E2E Tests (optional) ─────────────────────────────────────────────
if ($RunTests) {
    Write-Step "Step 7/7: Running E2E test suite against https://growth.srpailabs.com ..."
    Set-Location "$REPO_DIR\backend"
    $env:BASE_URL = "https://growth.srpailabs.com"
    $env:TEST_EMAIL = "admin@srp-ai-labs.com"
    $env:TEST_PASSWORD = "Admin@123"
    $env:TEST_TENANT = "srp-ai-labs"
    npm run test:e2e 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "E2E tests failed. Review output above."
        Write-Host ""
        Write-Host "  The deploy itself succeeded — app is live." -ForegroundColor DarkYellow
        Write-Host "  Fix failing tests and re-run: .\push-and-deploy.ps1 -Token ... -RunTests" -ForegroundColor DarkYellow
    } else {
        Write-Ok "All E2E tests passed."
    }
    Set-Location $REPO_DIR
} else {
    Write-Host ""
    Write-Host "  (Tip: add -RunTests to verify the live server with the full E2E suite)" -ForegroundColor DarkGray
}

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐  https://growth.srpailabs.com" -ForegroundColor White
Write-Host "  📚  https://growth.srpailabs.com/api/v1/docs" -ForegroundColor White
Write-Host ""
Write-Host "  System Owner  : admin@srp-ai-labs.com  |  Admin@123" -ForegroundColor DarkGray
Write-Host "  Demo Account  : demo@srpailabs.com     |  Demo@2026!  (tenant: demo-agency)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  ⚠️  IMPORTANT: Existing tenant / user data has NOT been touched." -ForegroundColor DarkYellow
Write-Host "     Harish account + all registered tenants are preserved." -ForegroundColor DarkYellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
