#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# backup-db.sh — PostgreSQL database backup script
# Usage: ./scripts/backup-db.sh [environment]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENVIRONMENT=${1:-production}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
BACKUP_FILE="${BACKUP_DIR}/srp_${ENVIRONMENT}_${TIMESTAMP}.sql.gz"

# Load environment variables from .env if present
if [ -f ".env.${ENVIRONMENT}" ]; then
  export $(grep -v '^#' ".env.${ENVIRONMENT}" | xargs)
elif [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Required: POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_USER, POSTGRES_HOST
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-srp_platform}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "ERROR: POSTGRES_PASSWORD not set"
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SRP AI Labs — Database Backup"
echo "Environment : ${ENVIRONMENT}"
echo "Database    : ${POSTGRES_DB}"
echo "Output      : ${BACKUP_FILE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --format=plain \
  --if-exists \
  --clean \
  --no-privileges \
  --no-owner \
  | gzip > "${BACKUP_FILE}"

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "✅ Backup complete: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Keep only last 30 backups for this environment
BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}/srp_${ENVIRONMENT}_"*.sql.gz 2>/dev/null | wc -l)
if [ "${BACKUP_COUNT}" -gt 30 ]; then
  ls -1t "${BACKUP_DIR}/srp_${ENVIRONMENT}_"*.sql.gz | tail -n +31 | xargs rm -f
  echo "🧹 Old backups cleaned up (kept 30 most recent)"
fi

echo "${BACKUP_FILE}"
