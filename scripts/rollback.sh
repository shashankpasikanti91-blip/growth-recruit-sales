#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# rollback.sh — Rollback to a previous backup
# Usage: ./scripts/rollback.sh [/path/to/backup.sql.gz]
#        If no backup file is given, uses the most recent one.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "${SCRIPT_DIR}")"
ENV_FILE="${ROOT_DIR}/backend/.env"

if [ -f "${ENV_FILE}" ]; then
  set -a && source "${ENV_FILE}" && set +a
fi

DB_URL="${DATABASE_URL:-}"
if [ -z "${DB_URL}" ]; then
  echo "❌ DATABASE_URL is not set. Cannot rollback."
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"

# Resolve backup file
BACKUP_FILE="${1:-}"
if [ -z "${BACKUP_FILE}" ]; then
  BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | head -1 || true)
fi

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ No backup file found in ${BACKUP_DIR}."
  echo "   Usage: ./scripts/rollback.sh /path/to/backup.sql.gz"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SRP AI Labs — Database Rollback"
echo "Backup file: ${BACKUP_FILE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  WARNING: This will STOP all services and REPLACE the current database."
echo "   All data since the backup was taken will be LOST."
echo ""
read -rp "Type 'ROLLBACK' to confirm: " CONFIRM
if [ "${CONFIRM}" != "ROLLBACK" ]; then
  echo "Rollback cancelled."
  exit 0
fi

echo ""
echo "[1/4] Stopping application services..."
cd "${ROOT_DIR}"
docker compose down --remove-orphans || true

echo ""
echo "[2/4] Restoring database from ${BACKUP_FILE}..."
"${SCRIPT_DIR}/restore-db.sh" "${BACKUP_FILE}"

echo ""
echo "[3/4] Restarting services..."
docker compose up -d

echo ""
echo "[4/4] Running health verification..."
sleep 10
"${SCRIPT_DIR}/verify-health.sh" || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Rollback complete."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
