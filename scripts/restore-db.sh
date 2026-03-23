#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# restore-db.sh — Restore PostgreSQL database from backup
# Usage: ./scripts/restore-db.sh <backup_file> [environment]
# WARNING: This OVERWRITES the current database. Always confirm before running.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_FILE="${1:-}"
ENVIRONMENT="${2:-production}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: ./scripts/restore-db.sh <backup_file.sql.gz> [environment]"
  echo ""
  echo "Available backups:"
  ls -1t ./backups/*.sql.gz 2>/dev/null || echo "  No backups found in ./backups/"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
  export $(grep -v '^#' ".env.${ENVIRONMENT}" | xargs)
elif [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-srp_platform}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  SRP AI Labs — Database RESTORE"
echo "Environment : ${ENVIRONMENT}"
echo "Database    : ${POSTGRES_DB}"
echo "From file   : ${BACKUP_FILE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "This will OVERWRITE the current database. Type 'YES' to confirm: " CONFIRM

if [ "${CONFIRM}" != "YES" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "Restoring from ${BACKUP_FILE}..."
gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${POSTGRES_PASSWORD}" psql \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}"

echo "✅ Restore complete."
