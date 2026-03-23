#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# verify-health.sh — Post-deploy health check
# Usage: ./scripts/verify-health.sh [base_url]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BASE_URL="${1:-http://localhost:8020}"
MAX_RETRIES=10
RETRY_DELAY=5

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SRP AI Labs — Health Verification"
echo "Target: ${BASE_URL}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_endpoint() {
  local url="${1}"
  local name="${2}"
  local attempt=0

  while [ $attempt -lt $MAX_RETRIES ]; do
    attempt=$((attempt + 1))
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${url}" --max-time 10 || echo "000")
    if [ "${HTTP_CODE}" = "200" ]; then
      echo "✅ ${name}: OK (${HTTP_CODE})"
      return 0
    else
      echo "⏳ ${name}: ${HTTP_CODE} — retrying (${attempt}/${MAX_RETRIES})..."
      sleep "${RETRY_DELAY}"
    fi
  done

  echo "❌ ${name}: FAILED after ${MAX_RETRIES} attempts (last: ${HTTP_CODE})"
  return 1
}

FAILED=0

check_endpoint "${BASE_URL}/health" "Backend Health" || FAILED=1
check_endpoint "${BASE_URL}/api/v1/health" "API v1 Health" || FAILED=1

# Check frontend if available
FRONTEND_URL="${2:-http://localhost:8021}"
check_endpoint "${FRONTEND_URL}" "Frontend" || FAILED=1

if [ $FAILED -eq 0 ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ All health checks passed. Deploy successful!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ Health checks FAILED. Consider rollback:"
  echo "   ./scripts/rollback.sh <backup_file>"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
