#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# pre-deploy.sh — Safe pre-deployment process
# Runs: backup → migrate → build
# Usage: ./scripts/pre-deploy.sh [environment]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENVIRONMENT="${1:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SRP AI Labs — Pre-Deploy Process"
echo "Environment: ${ENVIRONMENT}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Backup current database
echo ""
echo "Step 1/3: Creating database backup..."
BACKUP_FILE=$(bash "${SCRIPT_DIR}/backup-db.sh" "${ENVIRONMENT}")
echo "Backup: ${BACKUP_FILE}"

# Step 2: Run Prisma migrations
echo ""
echo "Step 2/3: Running database migrations..."
cd "$(dirname "${SCRIPT_DIR}")"
npx prisma migrate deploy --schema=backend/prisma/schema.prisma
echo "✅ Migrations applied"

# Step 3: Build Docker images
echo ""
echo "Step 3/3: Building Docker images..."
docker compose -f docker-compose.prod.yml build --no-cache
echo "✅ Images built"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Pre-deploy complete. Run deploy:"
echo "   docker compose -f docker-compose.prod.yml up -d"
echo "   ./scripts/verify-health.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
