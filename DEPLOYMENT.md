# Deployment Guide

This document covers everything needed to stand up the Recruitment + Sales Agentic Automation Platform in a self-hosted or cloud environment.

---

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Docker | 24.x |
| Docker Compose | v2.x (plugin) |
| Node.js | 20 LTS (local dev only) |
| Git | any |

---

## Quick Start (Local / Single Server)

### 1. Clone & Configure

```bash
git clone <your-repo>
cd recruitment-sales-platform
cp .env.example .env
```

Edit `.env` and fill in every `REPLACE_ME` value (see **Environment Variables** below).

### 2. Start All Services

```bash
docker compose up -d --build
```

This starts five containers:

| Service | Port | Purpose |
|---------|------|---------|
| `postgres` | 5432 | Primary database |
| `redis` | 6379 | BullMQ queues + session cache |
| `backend` | 3001 | NestJS API |
| `frontend` | 3000 | Next.js UI |
| `n8n` | 5678 | Workflow automation |

### 3. Run Database Migrations & Seed

```bash
# Wait for postgres to be healthy, then:
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

The seed creates:
- 7 country configs (MY, IN, AU, SG, AE, GB, US)
- Demo tenant: **SRP AI Labs**
- Admin user with the email and password defined in `seed.ts`
- 5 default AI prompt templates
- 16 visa rules across 7 countries
- 5 pricing plans (Free through Enterprise)
- Active subscription for the demo tenant

### 4. Verify

| URL | What you should see |
|-----|-------------------|
| http://localhost:3000 | Frontend login page |
| http://localhost:3001/api/v1/docs | Swagger UI |
| http://localhost:5678 | n8n editor |

---

## Environment Variables

All variables live in the root `.env` file and are shared via `docker-compose.yml`.

### Database

| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://growth_user:password@postgres:5432/growth_platform` | Use service name `postgres` inside Docker |
| `DB_USER` | `growth_user` | |
| `DB_PASSWORD` | *(strong random password)* | Change in production |
| `DB_NAME` | `growth_platform` | |

### Redis

| Variable | Example |
|----------|---------|
| `REDIS_HOST` | `redis` |
| `REDIS_PORT` | `6379` |
| `REDIS_PASSWORD` | *(strong random password)* |
| `REDIS_URL` | `redis://:PASSWORD@redis:6379` |

### Authentication

| Variable | Example | Notes |
|----------|---------|-------|
| `JWT_SECRET` | 64-char random string | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | 64-char random string | Different from access secret |
| `JWT_EXPIRES_IN` | `15m` | |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | |

### AI Providers

| Variable | Example | Notes |
|----------|---------|-------|
| `AI_PROVIDER` | `openai` or `openrouter` | |
| `OPENAI_API_KEY` | `sk-...` | Required if provider=openai |
| `OPENROUTER_API_KEY` | `sk-or-...` | Required if provider=openrouter |
| `OPENROUTER_MODEL` | `anthropic/claude-3.5-sonnet` | Any OpenRouter model |

### n8n Integration

| Variable | Example | Notes |
|----------|---------|-------|
| `N8N_WEBHOOK_SECRET` | 32-char random string | Must match n8n variable `N8N_WEBHOOK_SECRET` |
| `N8N_BASE_URL` | `http://n8n:5678` | Internal service URL |

### Email (SMTP)

| Variable | Example |
|----------|---------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `noreply@yourdomain.com` |
| `SMTP_PASSWORD` | *(app password or API key)* |
| `SMTP_FROM` | `SRP AI Labs <noreply@srp-ai-labs.com>` |

### Frontend

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` (dev) or `https://growth.srpailabs.com/api` (prod) |

---

## Production Deployment

### Using a Reverse Proxy (Nginx)

The production deployment uses Nginx as a reverse proxy with path-based routing. API requests go to `/api/` and the frontend serves from `/`.

See the bundled Nginx config in `nginx/growth.srpailabs.com` for the full production configuration including:
- TLS 1.2/1.3 with Cloudflare Origin Certificate
- Rate limiting on API (30 req/s) and auth (10 req/min) endpoints
- WebSocket support on `/ws`
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options)
- 25MB upload limit

### SSL / TLS

Production uses Cloudflare Origin Certificates stored at:
```
/etc/ssl/cloudflare/growth.srpailabs.com.pem
/etc/ssl/cloudflare/growth.srpailabs.com.key
```

For non-Cloudflare setups, use Certbot:
```bash
certbot --nginx -d yourdomain.com
```

### Secrets Management

- Never commit `.env` to version control.
- In production, use Docker secrets or a secrets manager (AWS Secrets Manager, HashiCorp Vault).
- Rotate `JWT_SECRET` and `JWT_REFRESH_SECRET` periodically — all sessions will be invalidated.

### Database Backups

```bash
# Automated daily backup via cron
0 2 * * * docker compose exec -T postgres pg_dump -U postgres recruitment_platform | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz
```

### Scaling

| Service | Scale strategy |
|---------|---------------|
| Backend | Horizontal — add replicas, use a load balancer. All state is in Postgres/Redis. |
| Frontend | Horizontal (stateless Next.js standalone build). |
| Redis | Use Redis Sentinel or Redis Cluster for HA. |
| Postgres | Use read replicas + connection pooler (PgBouncer). |
| n8n | Single instance recommended; n8n enterprise supports clustering. |

---

## Database Migrations

```bash
# Development — create a new migration after editing schema.prisma
docker compose exec backend npx prisma migrate dev --name <migration_name>

# Production — apply pending migrations (safe, non-destructive)
docker compose exec backend npx prisma migrate deploy

# View migration status
docker compose exec backend npx prisma migrate status
```

---

## Useful Commands

```bash
# Tail all logs
docker compose logs -f

# Tail backend only
docker compose logs -f backend

# Open Prisma Studio (database GUI)
docker compose exec backend npx prisma studio

# Shell into backend
docker compose exec backend sh

# Reset database (DESTRUCTIVE — dev only)
docker compose exec backend npx prisma migrate reset

# Stop all services
docker compose down

# Stop and remove volumes (DESTRUCTIVE)
docker compose down -v
```

---

## Health Checks

| Endpoint | Expected |
|----------|---------|
| `GET /api/v1/health` | `{ "status": "ok" }` |
| `GET /api/docs` | Swagger HTML |

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| Backend fails to start | Check `DATABASE_URL` — postgres container may not be ready yet. Add `depends_on: postgres: condition: service_healthy` or wait 10s. |
| Prisma migration fails | Run `docker compose exec backend npx prisma generate` first |
| n8n can't reach backend | Use `http://backend:3001` not `http://localhost:3001` inside Docker network |
| JWT errors after env change | Old refresh tokens in DB are now invalid — run `DELETE FROM refresh_tokens;` |
| BullMQ jobs not processing | Check Redis connection and ensure processors are registered in `app.module.ts` |
