# Release Readiness Package
**Platform:** SRP AI Labs — Recruitment + Sales Agentic Automation Platform  
**Version:** 2.0.0  
**Date:** April 16, 2026  
**Domain:** https://growth.srpailabs.com  
**Server:** Hetzner Cloud (5.223.67.236), 4GB RAM, Docker Compose

---

## 1. Production Deployment Checklist

### Pre-Deployment

- [ ] Back up production database: `scripts/backup-db.sh`
- [ ] Back up current `.env` file on server
- [ ] Verify local code compiles with zero TS errors: `cd backend && npx tsc --noEmit`
- [ ] Verify `.env` on server has all variables from `.env.production.example`
- [ ] Verify SSL certificate files exist at `/etc/ssl/cloudflare/growth.srpailabs.com.{pem,key}`
- [ ] Verify no secrets in committed files: `git log --diff-filter=A --name-only | xargs grep -l "password\|secret" 2>/dev/null`
- [ ] Confirm which branch to deploy (local: `master`, server tracks `origin/master`)

### Deployment Steps

1. [ ] Push to GitHub: `git push origin master`
2. [ ] SSH into server: `ssh root@5.223.67.236`
3. [ ] Navigate to app: `cd /opt/growth-platform`
4. [ ] Pull latest code: `git fetch origin && git reset --hard origin/master && git clean -fd`
5. [ ] Build containers: `docker compose -f docker-compose.prod.yml build --no-cache --parallel`
6. [ ] Start DB + Redis first: `docker compose -f docker-compose.prod.yml up -d postgres redis`
7. [ ] Wait for DB health: `docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U growth_user`
8. [ ] Start MinIO: `docker compose -f docker-compose.prod.yml up -d minio`
9. [ ] Run migrations: `docker compose -f docker-compose.prod.yml run --rm backend sh -c "npx prisma migrate deploy"`
10. [ ] Run seed (first deploy only or to update plans/visa rules): `docker compose -f docker-compose.prod.yml run --rm backend sh -c "npx prisma db seed"`
11. [ ] Start all services: `docker compose -f docker-compose.prod.yml up -d`
12. [ ] Copy nginx config: `cp nginx/growth.srpailabs.com /etc/nginx/sites-enabled/growth.srpailabs.com`
13. [ ] Test and reload nginx: `nginx -t && nginx -s reload`
14. [ ] Wait 30s for backend startup
15. [ ] Verify backend health: `curl -s http://127.0.0.1:8020/api/v1/health`
16. [ ] Verify frontend: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8021`
17. [ ] Verify public HTTPS: `curl -s -o /dev/null -w "%{http_code}" https://growth.srpailabs.com`
18. [ ] Log in via browser and verify dashboard loads

### Post-Deployment

- [ ] Verify demo account login works
- [ ] Verify at least one page from each sidebar section loads
- [ ] Verify file upload works (Documents page)
- [ ] Check container logs for errors: `docker compose -f docker-compose.prod.yml logs --tail=100 backend`
- [ ] Monitor memory usage: `docker stats --no-stream`

---

## 2. Rollback Checklist

If something breaks after deployment:

1. [ ] Stop all containers: `docker compose -f docker-compose.prod.yml down`
2. [ ] Check if the issue is migration-related or code-related
3. [ ] **If code-related:**
   - [ ] `git log --oneline -5` to find last working commit
   - [ ] `git reset --hard <last-working-sha>`
   - [ ] `docker compose -f docker-compose.prod.yml build --no-cache backend frontend`
   - [ ] `docker compose -f docker-compose.prod.yml up -d`
4. [ ] **If migration-related (data corruption):**
   - [ ] Stop all services: `docker compose -f docker-compose.prod.yml down`
   - [ ] Restore database: `scripts/restore-db.sh <backup-file>`
   - [ ] Reset code to last working commit
   - [ ] Rebuild and restart
5. [ ] **If nginx-related:**
   - [ ] Check config syntax: `nginx -t`
   - [ ] Restore previous config from backup
   - [ ] `nginx -s reload`
6. [ ] Verify rollback: health check + login + dashboard
7. [ ] Document what went wrong for post-mortem

### Quick Emergency Stop

```bash
# Stop everything immediately
docker compose -f docker-compose.prod.yml stop backend frontend
# DB and Redis stay running — data is safe
```

---

## 3. Database Migration Checklist

### Before Running Migrations

- [ ] Back up database: `scripts/backup-db.sh`
- [ ] Check pending migrations: `docker compose -f docker-compose.prod.yml run --rm backend sh -c "npx prisma migrate status"`
- [ ] Review each pending migration SQL in `backend/prisma/migrations/*/migration.sql`
- [ ] Confirm all migrations are additive (no DROP TABLE, no DROP COLUMN without deprecation)
- [ ] Confirm no data-destructive operations

### Current Migrations (in order)

| # | Migration | Type | Safe? |
|---|-----------|------|-------|
| 1 | `20260323000001_add_candidate_screening_workflow_type` | Enum addition | ✅ Additive |
| 2 | `20260323000002_soft_delete_and_tenant_relations` | Add columns + enum | ✅ Additive |
| 3 | `20260323000003_google_maps_import_source` | Enum addition | ✅ Additive |
| 4 | `20260403000001_saas_upgrade_business_ids_usage_auth` | Add columns + tables | ✅ Additive |
| 5 | `20260403000002_google_auth_invites_onboarding` | Add tables + columns | ✅ Additive |
| 6 | `20260403000003_document_storage` | Add table | ✅ Additive |
| 7 | `20260405000001_workflow_pause_resume_import_bid` | Add columns | ✅ Additive |
| 8 | `20260409000001_apollo_import_source` | Enum addition | ✅ Additive |
| 9 | `20260416000001_security_hardening_indexes` | Add indexes | ✅ Additive |

### Running Migrations

```bash
# On server, via Docker:
docker compose -f docker-compose.prod.yml run --rm backend sh -c "npx prisma migrate deploy"
```

### After Migrations

- [ ] Verify migration status shows all applied
- [ ] Run seed if plan/visa data updated: `docker compose -f docker-compose.prod.yml run --rm backend sh -c "npx prisma db seed"`
- [ ] Test API health check
- [ ] Verify login still works

---

## 4. Owner Account QA Checklist

The owner account (`SUPER_ADMIN` role) has platform-wide access.

### Access & Authentication

- [ ] Owner can log in with correct credentials
- [ ] Owner token refreshes correctly (wait 15+ min, action still works)
- [ ] Owner can access `/dashboard`
- [ ] Owner sees "Owner Control Panel" in sidebar

### Owner Control Panel

- [ ] View all tenants across the platform
- [ ] View signup feed (recent signups)
- [ ] Toggle tenant active/inactive
- [ ] Set custom tenant limits (users, candidates, leads, AI calls)
- [ ] View platform-wide analytics

### Tenant Management

- [ ] Create a new tenant manually
- [ ] View any tenant's details
- [ ] Deactivate a tenant → verify its users cannot log in
- [ ] Reactivate tenant → verify its users can log in again

### Security

- [ ] Owner cannot access owner panel with TENANT_ADMIN role (403)
- [ ] Non-owner cannot reach `/api/v1/tenants` list endpoint (403)
- [ ] Owner credentials are NOT hardcoded anywhere in the codebase (verified via grep)
- [ ] Owner gets Telegram/email notifications on new signups (if configured)

---

## 5. Demo Account QA Checklist

The demo account is a `TENANT_ADMIN` on the "SRP AI Labs" tenant — used for client presentations.

### Login & First Impression

- [ ] Login with demo credentials works
- [ ] Dashboard loads with data (or clean "Get Started" onboarding)
- [ ] SRP AI Labs branding visible in sidebar
- [ ] No broken images, missing icons, or layout shifts
- [ ] Subscription status shows correctly (STARTER plan, ACTIVE)

### Core Module Navigation (verify each loads without error)

- [ ] Dashboard — KPIs or empty-state quickstart
- [ ] Candidates — list view loads, search works
- [ ] Jobs — list view loads
- [ ] Applications — status filter tabs work
- [ ] Leads — list and pipeline view
- [ ] Companies — list view
- [ ] Contacts — list view
- [ ] Outreach — sequence list
- [ ] Documents — document vault loads
- [ ] Imports — import history
- [ ] Workflows — workflow run log
- [ ] Analytics — charts render
- [ ] AI screen — upload + scoring form
- [ ] LinkedIn AI — all 6 content tabs
- [ ] Visa Guide — country selector + visa type list
- [ ] Billing — plan card + usage meters
- [ ] Settings — team management view
- [ ] Users — user list (admin only)
- [ ] Integrations — integration cards

### Key Workflows

- [ ] Create a candidate manually → appears in list
- [ ] Import CSV with 3-5 rows → mapping screen → review → imported
- [ ] Upload a document → appears in vault → download works
- [ ] Create a lead → appears in pipeline
- [ ] Run AI screening on a candidate vs a job → score appears
- [ ] Generate outreach message → text appears with subject/body

### UI Quality

- [ ] No "lorem ipsum" anywhere
- [ ] No "Coming soon" placeholders
- [ ] No dead buttons (every visible button does something or is properly disabled)
- [ ] No console errors in browser dev tools
- [ ] Responsive on tablet viewport (1024px)

---

## 6. Marketing Website QA Checklist

The marketing website is the public-facing landing page at `https://growth.srpailabs.com`.

### Brand Consistency

- [ ] Navigation bar shows "SRP AI Labs" (not "RecruiSales AI")
- [ ] Login page shows "SRP AI Labs"
- [ ] Pricing page shows "SRP AI Labs"
- [ ] Footer shows "© 2026 SRP AI Labs"
- [ ] Google auth callback toast says "Welcome to SRP AI Labs"
- [ ] Browser tab title says "SRP AI Labs Platform"

### Hero Section

- [ ] Stats show factual values (AI / 7+ / 5) — not unverified performance claims
- [ ] "Start Free Trial" button links to `/login`
- [ ] "View Pricing" button links to `/pricing`
- [ ] "No credit card required · 14-day free trial" text is accurate

### Features Section

- [ ] All 9 feature cards accurately describe real features
- [ ] No features listed that don't actually work
- [ ] Feature descriptions match actual product behavior

### Social Proof Section

- [ ] No fabricated testimonials with fake names/companies
- [ ] Quote is generic/honest: "AI-powered screening and lead scoring..."
- [ ] Attribution reads "Built for recruitment agencies & B2B sales teams"

### Pricing Section

- [ ] Free Trial: $0 → matches seed data
- [ ] Starter: $69/mo → matches seed data
- [ ] Growth: $149/mo → matches seed data
- [ ] Enterprise: "Custom" → matches seed data
- [ ] "Contact Sales" links to `mailto:sales@srpailabs.com`
- [ ] Other CTAs link to `/signup`

### Security Section

- [ ] All 8 security features are real and implemented
- [ ] No exaggerated claims

### Footer

- [ ] Pricing link works
- [ ] Terms link works (or shows placeholder page, not 404)
- [ ] Privacy link works (or shows placeholder page, not 404)
- [ ] Login link works

### Technical

- [ ] Page loads under 3s on 4G connection
- [ ] No console errors
- [ ] Mobile viewport (375px) renders correctly
- [ ] All images/icons load

---

## 7. Multi-Tenant Onboarding QA Checklist

### Self-Signup Flow (Email)

- [ ] Navigate to `/signup`
- [ ] Fill in: name, email, password, company name
- [ ] Submit → receives OTP email (if SMTP configured)
- [ ] Verify email page shows → enter OTP
- [ ] After verification: user status = `active`, tenant created
- [ ] User is `TENANT_ADMIN` on the new tenant
- [ ] 14-day STARTER trial subscription auto-created
- [ ] TenantOnboarding record created
- [ ] Default mapping templates seeded for new tenant
- [ ] Default ICP profile seeded
- [ ] Default prompt templates seeded
- [ ] Owner gets notified of new signup (if Telegram/email configured)

### Self-Signup Flow (Google OAuth)

- [ ] Click "Sign in with Google" on signup page
- [ ] Google auth flow completes
- [ ] New tenant auto-created with slug
- [ ] User set to `active` immediately (no OTP needed)
- [ ] Subscription + onboarding seeded
- [ ] Redirect to `/dashboard`

### Invite Flow

- [ ] Admin creates invite from Team page
- [ ] Invite email sent (or link generated)
- [ ] New user clicks invite link → signup form pre-filled
- [ ] User joins existing tenant with invited role
- [ ] Tenant user limit checked (won't exceed plan max)
- [ ] Invite can be resent or revoked

### Tenant Isolation

- [ ] User from Tenant A cannot see Tenant B's candidates
- [ ] User from Tenant A cannot see Tenant B's leads
- [ ] User from Tenant A cannot see Tenant B's documents
- [ ] Direct API calls with wrong tenantId return 404/403
- [ ] Login with email that exists in multiple tenants requires tenantSlug

### Role Enforcement

- [ ] VIEWER cannot create/edit candidates or leads
- [ ] RECRUITER can create candidates but not manage billing
- [ ] SALES can create leads but not manage billing
- [ ] TENANT_ADMIN can manage team, billing, settings
- [ ] SUPER_ADMIN can access owner control panel

### Usage Limits

- [ ] New tenant starts with STARTER plan limits
- [ ] Creating candidates past limit → `ForbiddenException`
- [ ] Creating leads past limit → `ForbiddenException`
- [ ] AI calls past limit → `ForbiddenException`
- [ ] Usage meters on billing page show correct counts vs limits

---

## 8. GitHub Cleanup Summary

### Files Updated in This Release

| File | Change |
|------|--------|
| `N8N_GUIDE.md` | Removed real owner credentials, sanitized webhook secret, fixed n8n URL |
| `readme.md` | Removed demo credentials, fixed SSL description |
| `deploy.sh` | Removed credential echo in deployment output |
| `DEPLOYMENT.md` | Removed credentials, fixed env var names, replaced Caddy with Nginx docs |
| `.env.example` | Removed real server IP, SSH fingerprint, deploy user |
| `.env.production.example` | Added 20+ missing vars (S3, Google OAuth, owner notifications, external APIs) |
| `AUDIT.md` | Complete rewrite — reflects current resolved state instead of stale March findings |
| `ARCHITECTURE.md` | Fixed backend port 4000 → 3001 in two diagram locations |
| `CHANGELOG.md` | Fixed version 2.0.0 date from future (2026-06-01) to actual (2026-04-16) |
| `frontend/src/app/page.tsx` | Replaced fake stats + fake testimonial with honest content |
| `frontend/src/app/login/page.tsx` | Brand: RecruiSales AI → SRP AI Labs |
| `frontend/src/app/pricing/page.tsx` | Brand: RecruiSales AI → SRP AI Labs |
| `frontend/src/app/layout.tsx` | Metadata: RecruiSales AI → SRP AI Labs |
| `frontend/src/app/auth/callback/page.tsx` | Brand: RecruiSales AI → SRP AI Labs |

### Files Archived

| File | Destination | Reason |
|------|-------------|--------|
| `IMPLEMENTATION_PLAN.md` | `docs/archive/IMPLEMENTATION_PLAN.md` | Outdated — most phases completed. Misleading in root. |

### Files to Verify Before Push

- [ ] No `.env` files committed (check `.gitignore`)
- [ ] No credentials remain in any `.md` file: `grep -ri "Admin@123\|SRP@Owner\|pasikanti" *.md **/*.md`
- [ ] No server IPs in committed files other than deployment docs
- [ ] `push-and-deploy.ps1` — update file list if new files added (or switch to full git sync)

### .gitignore Status

Current `.gitignore` correctly excludes:
- `.env`, `.env.local`, `.env.production`, `.env.*.local`
- `*.pem`, `*.key`, `*.crt`
- `node_modules/`, `dist/`, `.next/`
- `coverage/`, `logs/`
- Docker volumes, editor files

### Recommended Commit Sequence

```bash
# 1. Stage and review all changes
git add -A
git diff --cached --stat

# 2. Commit with descriptive message
git commit -m "release: v2.0.0 — credential sanitization, doc alignment, brand unification

- Remove all exposed credentials from docs and scripts
- Fix env var name mismatches in DEPLOYMENT.md
- Fix backend port 4000→3001 in ARCHITECTURE.md
- Unify branding to 'SRP AI Labs' across all frontend pages
- Replace fake testimonial and unverified marketing stats
- Rewrite AUDIT.md to reflect current resolved state
- Complete .env.production.example with all required vars
- Archive stale IMPLEMENTATION_PLAN.md to docs/archive/
- Fix CHANGELOG date to actual release date"

# 3. Push
git push origin master
```

---

## 9. Outdated Files/Docs — Final Status

| File | Action | Reason |
|------|--------|--------|
| `IMPLEMENTATION_PLAN.md` | **Archived** → `docs/archive/` | Most phases complete; misleading in root |
| `AUDIT.md` | **Rewritten** | Was stale March snapshot; now shows resolved state |
| `ARCHITECTURE.md` | **Fixed** | Port 4000 → 3001 |
| `CHANGELOG.md` | **Fixed** | Future date → actual date |
| `DEPLOYMENT.md` | **Fixed** | Wrong env var names, wrong proxy example, exposed credentials |
| `N8N_GUIDE.md` | **Fixed** | Exposed real owner credentials and webhook secret |
| `readme.md` | **Fixed** | Exposed demo credentials, wrong SSL info |
| `.env.example` | **Fixed** | Contained real server IP and SSH fingerprint |
| `.env.production.example` | **Fixed** | Was missing 20+ required variables |
| `docs/BRANCH_STRATEGY.md` | **Keep** | Still relevant (verify content is current) |

### Root Structure (Final)

```
├── backend/              # NestJS API
├── frontend/             # Next.js UI
├── docs/                 # Additional documentation
│   ├── BRANCH_STRATEGY.md
│   └── archive/
│       └── IMPLEMENTATION_PLAN.md
├── n8n/                  # Workflow JSON files
│   └── workflows/
├── nginx/                # Nginx site config
├── scripts/              # Operational scripts
│   ├── backup-db.sh
│   ├── restore-db.sh
│   ├── pre-deploy.sh
│   ├── rollback.sh
│   ├── verify-health.sh
│   └── reset-demo-account.ps1
├── .env.example          # Dev environment template
├── .env.production.example # Production environment template
├── .gitignore
├── ARCHITECTURE.md       # System architecture diagram
├── AUDIT.md              # Security audit status
├── CHANGELOG.md          # Version history
├── DEPLOYMENT.md         # Deployment guide
├── N8N_GUIDE.md          # n8n setup guide
├── README.md             # Project overview
├── deploy.sh             # Server deployment script
├── push-and-deploy.ps1   # Local push + deploy script
├── docker-compose.yml    # Development compose
└── docker-compose.prod.yml # Production compose
```

---

## 10. Manual Server Steps Required

These actions cannot be automated from local and must be performed on the production server.

### One-Time Setup (if not already done)

- [ ] **SSH access:** Verify SSH key access to `root@5.223.67.236`
- [ ] **Docker:** Verify Docker + Docker Compose v2 installed
- [ ] **Nginx:** Verify Nginx is installed and running
- [ ] **SSL certs:** Verify Cloudflare Origin Certificate at `/etc/ssl/cloudflare/growth.srpailabs.com.{pem,key}`
- [ ] **App directory:** Verify `/opt/growth-platform` exists
- [ ] **Git remote:** Verify repo can be pulled (SSH key or token configured)
- [ ] **Server .env:** Create/update `/opt/growth-platform/.env` from `.env.production.example` with real secrets
- [ ] **MinIO bucket:** After first start, create the `documents` bucket in MinIO if it doesn't exist:
  ```bash
  docker exec growth_minio mc alias set local http://localhost:9000 $S3_ACCESS_KEY $S3_SECRET_KEY
  docker exec growth_minio mc mb local/documents --ignore-existing
  ```

### Every Deployment

- [ ] Run database backup before deploying: `scripts/backup-db.sh`
- [ ] Pull code: `git fetch origin && git reset --hard origin/master`
- [ ] Build, migrate, restart (see Deployment Checklist above)
- [ ] Verify health: `curl http://127.0.0.1:8020/api/v1/health`

### If Adding New Environment Variables

- [ ] Add to server `.env` file: `nano /opt/growth-platform/.env`
- [ ] If variable needs to be in Docker: verify it's in `docker-compose.prod.yml` environment section
- [ ] Rebuild affected container: `docker compose -f docker-compose.prod.yml up -d --build backend`

### If SMTP Needs Configuration

- [ ] Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` in server `.env`
- [ ] For Gmail: enable "App Passwords" and use app-specific password
- [ ] Restart backend: `docker compose -f docker-compose.prod.yml restart backend`
- [ ] Test by inviting a user from the Team page

### If Owner Notifications Need Setup

- [ ] Create Telegram bot via @BotFather, get bot token
- [ ] Get your Telegram chat ID
- [ ] Set `OWNER_EMAIL`, `OWNER_TELEGRAM_BOT_TOKEN`, `OWNER_TELEGRAM_CHAT_ID` in `.env`
- [ ] Restart backend

### If Google OAuth Needs Setup

- [ ] Create Google Cloud project + OAuth credentials
- [ ] Set authorized redirect URI to `https://growth.srpailabs.com/api/v1/auth/google/callback`
- [ ] Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in server `.env`
- [ ] Restart backend

### Monitoring Commands

```bash
# View all container status
docker compose -f docker-compose.prod.yml ps

# View backend logs (last 200 lines, follow)
docker compose -f docker-compose.prod.yml logs --tail=200 -f backend

# View frontend logs
docker compose -f docker-compose.prod.yml logs --tail=100 -f frontend

# Check memory usage
docker stats --no-stream

# Check disk usage
df -h /var/lib/docker

# Check database size
docker exec growth_postgres psql -U growth_user -d growth_platform -c "SELECT pg_size_pretty(pg_database_size('growth_platform'));"

# Check migration status
docker compose -f docker-compose.prod.yml run --rm backend sh -c "npx prisma migrate status"
```
