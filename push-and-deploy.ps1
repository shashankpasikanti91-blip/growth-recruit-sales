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

# ── STEP 2: SCP files to server ──────────────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 2: Uploading changed files to server..." -ForegroundColor Yellow

$files = @(
    # Backend core
    @{ local = "backend\src\app.module.ts";                    remote = "backend/src/app.module.ts" },
    @{ local = "backend\src\main.ts";                          remote = "backend/src/main.ts" },
    @{ local = "backend\src\modules\ai\ai.controller.ts";     remote = "backend/src/modules/ai/ai.controller.ts" },
    @{ local = "backend\src\modules\analytics\analytics.service.ts"; remote = "backend/src/modules/analytics/analytics.service.ts" },
    @{ local = "backend\src\modules\leads\leads.controller.ts"; remote = "backend/src/modules/leads/leads.controller.ts" },
    @{ local = "backend\src\modules\leads\leads.module.ts";    remote = "backend/src/modules/leads/leads.module.ts" },
    @{ local = "backend\src\modules\leads\leads.service.ts";   remote = "backend/src/modules/leads/leads.service.ts" },
    @{ local = "backend\src\modules\imports\imports.controller.ts"; remote = "backend/src/modules/imports/imports.controller.ts" },
    @{ local = "backend\src\modules\imports\imports.service.ts"; remote = "backend/src/modules/imports/imports.service.ts" },
    @{ local = "backend\src\modules\tenants\tenants.controller.ts"; remote = "backend/src/modules/tenants/tenants.controller.ts" },
    @{ local = "backend\src\modules\tenants\tenants.service.ts"; remote = "backend/src/modules/tenants/tenants.service.ts" },
    @{ local = "backend\src\modules\tenants\tenants.module.ts"; remote = "backend/src/modules/tenants/tenants.module.ts" },
    @{ local = "backend\src\processors\dedupe.processor.ts";   remote = "backend/src/processors/dedupe.processor.ts" },
    @{ local = "backend\src\processors\enrichment.processor.ts"; remote = "backend/src/processors/enrichment.processor.ts" },
    @{ local = "backend\src\processors\outreach.processor.ts"; remote = "backend/src/processors/outreach.processor.ts" },
    @{ local = "backend\prisma\schema.prisma";                 remote = "backend/prisma/schema.prisma" },
    @{ local = "backend\prisma\seed.ts";                       remote = "backend/prisma/seed.ts" },
    @{ local = "backend\package.json";                         remote = "backend/package.json" },
    # Backend — bug fix batch (April 2026)
    @{ local = "backend\src\modules\candidates\candidates.service.ts"; remote = "backend/src/modules/candidates/candidates.service.ts" },
    @{ local = "backend\src\modules\leads\lead-import.service.ts"; remote = "backend/src/modules/leads/lead-import.service.ts" },
    @{ local = "backend\src\modules\contacts\contacts.service.ts"; remote = "backend/src/modules/contacts/contacts.service.ts" },
    @{ local = "backend\src\modules\contacts\contacts.controller.ts"; remote = "backend/src/modules/contacts/contacts.controller.ts" },
    @{ local = "backend\src\modules\applications\applications.service.ts"; remote = "backend/src/modules/applications/applications.service.ts" },
    @{ local = "backend\src\modules\applications\applications.controller.ts"; remote = "backend/src/modules/applications/applications.controller.ts" },
    # E2E tests (updated assertions)
    @{ local = "backend\test\e2e\analytics.spec.ts"; remote = "backend/test/e2e/analytics.spec.ts" },
    @{ local = "backend\test\e2e\documents.spec.ts"; remote = "backend/test/e2e/documents.spec.ts" },
    @{ local = "backend\test\e2e\health.spec.ts";    remote = "backend/test/e2e/health.spec.ts" },
    @{ local = "backend\test\e2e\leads.spec.ts";     remote = "backend/test/e2e/leads.spec.ts" },
    @{ local = "backend\test\e2e\modules.spec.ts";   remote = "backend/test/e2e/modules.spec.ts" },
    # Config
    @{ local = "frontend\next.config.js"; remote = "frontend/next.config.js" },
    @{ local = "DEPLOYMENT.md"; remote = "DEPLOYMENT.md" },
    @{ local = "deploy.sh"; remote = "deploy.sh" },
    # Frontend core
    @{ local = "frontend\src\lib\api.ts";                      remote = "frontend/src/lib/api.ts" },
    @{ local = "frontend\src\lib\api-client.ts";               remote = "frontend/src/lib/api-client.ts" },
    @{ local = "frontend\src\components\layout\sidebar.tsx";   remote = "frontend/src/components/layout/sidebar.tsx" },
    @{ local = "frontend\src\components\GoogleLoginButton.tsx"; remote = "frontend/src/components/GoogleLoginButton.tsx" },
    @{ local = "frontend\src\app\page.tsx";                    remote = "frontend/src/app/page.tsx" },
    @{ local = "frontend\src\app\login\page.tsx";              remote = "frontend/src/app/login/page.tsx" },
    @{ local = "frontend\src\app\auth\callback\page.tsx";      remote = "frontend/src/app/auth/callback/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\imports\page.tsx"; remote = "frontend/src/app/(dashboard)/imports/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\ai\screen\page.tsx"; remote = "frontend/src/app/(dashboard)/ai/screen/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\billing\page.tsx"; remote = "frontend/src/app/(dashboard)/billing/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\candidates\[id]\page.tsx"; remote = "frontend/src/app/(dashboard)/candidates/[id]/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\candidates\new\page.tsx"; remote = "frontend/src/app/(dashboard)/candidates/new/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\companies\page.tsx"; remote = "frontend/src/app/(dashboard)/companies/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\dashboard\page.tsx"; remote = "frontend/src/app/(dashboard)/dashboard/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\jobs\page.tsx";   remote = "frontend/src/app/(dashboard)/jobs/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\leads\page.tsx";  remote = "frontend/src/app/(dashboard)/leads/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\applications\page.tsx"; remote = "frontend/src/app/(dashboard)/applications/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\contacts\page.tsx"; remote = "frontend/src/app/(dashboard)/contacts/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\settings\page.tsx"; remote = "frontend/src/app/(dashboard)/settings/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\visa-guide\page.tsx"; remote = "frontend/src/app/(dashboard)/visa-guide/page.tsx" },
    # Docs
    @{ local = "readme.md";                                    remote = "readme.md" },
    @{ local = "CHANGELOG.md";                                 remote = "CHANGELOG.md" },
    # Docker
    @{ local = "docker-compose.prod.yml";                      remote = "docker-compose.prod.yml" }
)

# New files (need directory creation)
$newFiles = @(
    # Previous session pages
    @{ local = "frontend\src\app\(dashboard)\jobs\[id]\page.tsx"; remote = "frontend/src/app/(dashboard)/jobs/[id]/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\leads\[id]\page.tsx"; remote = "frontend/src/app/(dashboard)/leads/[id]/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\leads\new\page.tsx"; remote = "frontend/src/app/(dashboard)/leads/new/page.tsx" },
    # New dashboard pages (v2)
    @{ local = "frontend\src\app\(dashboard)\workflows\page.tsx"; remote = "frontend/src/app/(dashboard)/workflows/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\integrations\page.tsx"; remote = "frontend/src/app/(dashboard)/integrations/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\errors\page.tsx"; remote = "frontend/src/app/(dashboard)/errors/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\users\page.tsx"; remote = "frontend/src/app/(dashboard)/users/page.tsx" },
    @{ local = "frontend\src\app\(dashboard)\linkedin\page.tsx"; remote = "frontend/src/app/(dashboard)/linkedin/page.tsx" },
    # Lead generate page
    @{ local = "frontend\src\app\(dashboard)\leads\generate\page.tsx"; remote = "frontend/src/app/(dashboard)/leads/generate/page.tsx" },
    # New backend modules
    @{ local = "backend\src\modules\health\health.controller.ts"; remote = "backend/src/modules/health/health.controller.ts" },
    @{ local = "backend\src\modules\health\health.module.ts"; remote = "backend/src/modules/health/health.module.ts" },
    @{ local = "backend\src\modules\cache\cache.service.ts"; remote = "backend/src/modules/cache/cache.service.ts" },
    @{ local = "backend\src\modules\cache\cache.module.ts"; remote = "backend/src/modules/cache/cache.module.ts" },
    @{ local = "backend\src\modules\tenants\tenant-onboarding.service.ts"; remote = "backend/src/modules/tenants/tenant-onboarding.service.ts" },
    @{ local = "backend\src\modules\leads\lead-import.service.ts"; remote = "backend/src/modules/leads/lead-import.service.ts" },
    # Filters
    @{ local = "backend\src\filters\global-exception.filter.ts"; remote = "backend/src/filters/global-exception.filter.ts" },
    # Scripts
    @{ local = "scripts\backup-db.sh"; remote = "scripts/backup-db.sh" },
    @{ local = "scripts\restore-db.sh"; remote = "scripts/restore-db.sh" },
    @{ local = "scripts\pre-deploy.sh"; remote = "scripts/pre-deploy.sh" },
    @{ local = "scripts\verify-health.sh"; remote = "scripts/verify-health.sh" },
    @{ local = "scripts\rollback.sh"; remote = "scripts/rollback.sh" },
    # Migrations
    @{ local = "backend\prisma\migrations\20260323000001_add_candidate_screening_workflow_type\migration.sql"; remote = "backend/prisma/migrations/20260323000001_add_candidate_screening_workflow_type/migration.sql" },
    @{ local = "backend\prisma\migrations\20260323000002_soft_delete_and_tenant_relations\migration.sql"; remote = "backend/prisma/migrations/20260323000002_soft_delete_and_tenant_relations/migration.sql" },
    @{ local = "backend\prisma\migrations\20260323000003_google_maps_import_source\migration.sql"; remote = "backend/prisma/migrations/20260323000003_google_maps_import_source/migration.sql" }
)

# Create new directories on server
Write-Host "  Creating new directories on server..."
ssh "${SERVER_USER}@${SERVER}" @"
mkdir -p ${SERVER_APP}/frontend/src/app/\(dashboard\)/jobs/\[id\]
mkdir -p ${SERVER_APP}/frontend/src/app/\(dashboard\)/leads/\[id\]
mkdir -p ${SERVER_APP}/frontend/src/app/\(dashboard\)/leads/new
mkdir -p ${SERVER_APP}/frontend/src/app/\(dashboard\)/leads/generate
mkdir -p ${SERVER_APP}/frontend/src/app/\(dashboard\)/applications
mkdir -p ${SERVER_APP}/frontend/src/app/\(dashboard\)/contacts
mkdir -p ${SERVER_APP}/frontend/src/app/\(dashboard\)/candidates/new
mkdir -p ${SERVER_APP}/frontend/src/app/\(dashboard\)/candidates/\[id\]
mkdir -p ${SERVER_APP}/frontend/src/app/\(dashboard\)/workflows
mkdir -p ${SERVER_APP}/frontend/src/app/\(dashboard\)/integrations
mkdir -p ${SERVER_APP}/frontend/src/app/\(dashboard\)/errors
mkdir -p ${SERVER_APP}/frontend/src/app/\(dashboard\)/users
mkdir -p ${SERVER_APP}/frontend/src/app/\(dashboard\)/linkedin
mkdir -p ${SERVER_APP}/frontend/src/app/auth/callback
mkdir -p ${SERVER_APP}/frontend/src/components
mkdir -p ${SERVER_APP}/backend/src/modules/health
mkdir -p ${SERVER_APP}/backend/src/modules/cache
mkdir -p ${SERVER_APP}/backend/src/modules/leads
mkdir -p ${SERVER_APP}/backend/src/modules/tenants
mkdir -p ${SERVER_APP}/backend/src/modules/candidates
mkdir -p ${SERVER_APP}/backend/src/modules/contacts
mkdir -p ${SERVER_APP}/backend/src/modules/applications
mkdir -p ${SERVER_APP}/backend/src/filters
mkdir -p ${SERVER_APP}/backend/test/e2e
mkdir -p ${SERVER_APP}/scripts
mkdir -p ${SERVER_APP}/backend/prisma/migrations/20260323000001_add_candidate_screening_workflow_type
mkdir -p ${SERVER_APP}/backend/prisma/migrations/20260323000002_soft_delete_and_tenant_relations
mkdir -p ${SERVER_APP}/backend/prisma/migrations/20260323000003_google_maps_import_source
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
Write-Host "  🔑 admin@srp-ai-labs.com / Admin@123" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
