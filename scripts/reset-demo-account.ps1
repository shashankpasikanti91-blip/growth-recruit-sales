# Reset Demo Account for Client Presentation
# Run this before any client demo to reset lead generation limits
# Usage: .\scripts\reset-demo-account.ps1

Write-Host "Resetting demo account to Starter plan..." -ForegroundColor Cyan

$sql = @"
UPDATE "Tenant"
SET
  plan = 'STARTER',
  "currentLeadUsage" = 0,
  "currentCandidateUsage" = 0,
  "currentAiUsage" = 0,
  "maxLeadsPerMonth" = 1000
WHERE slug = 'srp-ai-labs';

UPDATE "Subscription"
SET
  status = 'ACTIVE',
  "trialEndsAt" = NULL
WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'srp-ai-labs');

SELECT
  t.name,
  t.plan,
  t."currentLeadUsage",
  t."maxLeadsPerMonth",
  s.status AS subscription_status
FROM "Tenant" t
LEFT JOIN "Subscription" s ON s."tenantId" = t.id
WHERE t.slug = 'srp-ai-labs';
"@

# Find postgres container
$container = docker ps --format "{{.Names}}" | Where-Object { $_ -like "*postgres*" } | Select-Object -First 1

if (-not $container) {
  Write-Host "ERROR: No postgres container running. Start Docker first." -ForegroundColor Red
  exit 1
}

Write-Host "Found container: $container" -ForegroundColor Gray
docker exec -i $container psql -U srp_user -d srp_platform -c $sql

Write-Host ""
Write-Host "Done! Demo account is ready:" -ForegroundColor Green
Write-Host "  Email:    admin@srp-ai-labs.com" -ForegroundColor White
Write-Host "  Password: Admin@123" -ForegroundColor White
Write-Host "  Plan:     Starter (1,000 leads/month, 100/day, 50/request)" -ForegroundColor White
