#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# deploy.sh — Full production deployment for growth.srpailabs.com
# Run on the Hetzner server as root after cloning the repo.
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Prerequisites on server:
#   - Docker & Docker Compose v2
#   - Nginx (system nginx already running)
#   - /etc/nginx/sites-enabled/ directory
#   - SSL cert/key already placed by scp (see step 0 notes)
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

APP_DIR="/opt/growth-platform"
REPO_URL="${REPO_URL:-https://github.com/srpailabs/recruitment-sales-platform.git}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="docker-compose.prod.yml"
NGINX_CONF_SRC="nginx/growth.srpailabs.com"
NGINX_CONF_DEST="/etc/nginx/sites-enabled/growth.srpailabs.com"
SSL_DIR="/etc/ssl/cloudflare"

echo "══════════════════════════════════════════════════════"
echo "  growth.srpailabs.com — Deployment Script"
echo "  $(date)"
echo "══════════════════════════════════════════════════════"

# ── 0. Pre-flight checks ──────────────────────────────────────────────────────
echo ""
echo "▶ Checking prerequisites..."
command -v docker   >/dev/null 2>&1 || { echo "❌ docker not found"; exit 1; }
command -v nginx    >/dev/null 2>&1 || { echo "❌ nginx not found";  exit 1; }
docker compose version >/dev/null 2>&1 || { echo "❌ docker compose v2 not found"; exit 1; }

if [ ! -f "$SSL_DIR/growth.srpailabs.com.pem" ] || [ ! -f "$SSL_DIR/growth.srpailabs.com.key" ]; then
    echo "⚠️  SSL certificate files not found in $SSL_DIR"
    echo "   Please run the SSL placement steps first (see README)."
    echo "   Continuing anyway (nginx will fail to reload if missing)..."
fi

# ── 1. Clone or update repo ───────────────────────────────────────────────────
echo ""
echo "▶ Syncing repository..."
if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git fetch origin
    git reset --hard "origin/$BRANCH"
    git clean -fd
    echo "✅ Repository updated"
else
    git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
    echo "✅ Repository cloned"
fi

# ── 2. Environment file ───────────────────────────────────────────────────────
echo ""
echo "▶ Checking .env file..."
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found."
    echo "   Copying .env.production.example → .env"
    cp .env.production.example .env
    echo "❌ STOP: Edit /opt/growth-platform/.env and fill in real secrets, then re-run."
    exit 1
fi
echo "✅ .env found"

# ── 3. Build & start containers ───────────────────────────────────────────────
echo ""
echo "▶ Building Docker images..."
docker compose -f "$COMPOSE_FILE" build --no-cache --parallel

echo ""
echo "▶ Starting PostgreSQL and Redis first..."
docker compose -f "$COMPOSE_FILE" up -d postgres redis

echo ""
echo "▶ Waiting for DB to be healthy (up to 60s)..."
for i in $(seq 1 12); do
    if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${DB_USER:-growth_user}" >/dev/null 2>&1; then
        echo "✅ PostgreSQL ready"
        break
    fi
    echo "   ...waiting ($((i*5))s)"
    sleep 5
    if [ "$i" -eq 12 ]; then
        echo "❌ PostgreSQL did not become healthy in 60s"
        docker compose -f "$COMPOSE_FILE" logs postgres
        exit 1
    fi
done

# ── 4. Run migrations & seed ──────────────────────────────────────────────────
echo ""
echo "▶ Running Prisma migrations..."
docker compose -f "$COMPOSE_FILE" run --rm \
    -e DATABASE_URL="postgresql://${DB_USER:-growth_user}:${DB_PASSWORD}@postgres:5432/${DB_NAME:-growth_platform}" \
    backend sh -c "npx prisma migrate deploy && npx prisma db seed"
echo "✅ Migrations and seed complete"

# ── 5. Start all services ─────────────────────────────────────────────────────
echo ""
echo "▶ Starting all services..."
docker compose -f "$COMPOSE_FILE" up -d
echo "✅ All containers started"

# ── 6. Copy Nginx config & reload ─────────────────────────────────────────────
echo ""
echo "▶ Installing Nginx config..."
cp "$NGINX_CONF_SRC" "$NGINX_CONF_DEST"
nginx -t && nginx -s reload
echo "✅ Nginx reloaded"

# ── 7. Verify ─────────────────────────────────────────────────────────────────
echo ""
echo "▶ Verifying services..."
sleep 10

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8020/api/v1/health || echo "000")
echo "   Backend health check: HTTP $HTTP_CODE"
[ "$HTTP_CODE" = "200" ] && echo "✅ Backend OK" || echo "⚠️  Backend not yet ready (check logs)"

HTTP_FRONT=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8021 || echo "000")
echo "   Frontend check: HTTP $HTTP_FRONT"
[ "$HTTP_FRONT" = "200" ] && echo "✅ Frontend OK" || echo "⚠️  Frontend not yet ready (check logs)"

echo ""
echo "══════════════════════════════════════════════════════"
echo "  ✅ Deployment complete!"
echo ""
echo "  🌐 https://growth.srpailabs.com"
echo ""
echo "  Verify login at the web UI with your admin credentials."
echo ""
echo "  Container logs:"
echo "    docker compose -f docker-compose.prod.yml logs -f backend"
echo "    docker compose -f docker-compose.prod.yml logs -f frontend"
echo "══════════════════════════════════════════════════════"
