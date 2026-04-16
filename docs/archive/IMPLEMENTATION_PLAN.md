# Implementation Plan
**Platform:** SRP AI Labs — Recruitment + Sales Agentic Automation Platform  
**Created:** March 23, 2026  
**Strategy:** Phase-by-phase, backward-compatible, safe migrations only

---

## Guiding Principles

1. **Never break existing functionality** — every change is additive or surgical
2. **Tenant isolation enforced in every write** — `tenantId` in all where clauses
3. **Safe migrations only** — additive schema changes, never drop/rename without deprecation period
4. **Backup before any schema change** — automated backup script runs pre-migration
5. **Low RAM budget** — optimize for 4GB server; avoid heavy in-memory operations
6. **No silent failures** — every error surfaced with structured logging
7. **Test locally before production** — all flows testable via docker-compose.yml

---

## Phase Summary

| Phase | Name | Priority | Status |
|---|---|---|---|
| **P0** | Critical Security Fixes | 🔴 Immediate | ✅ In Progress |
| **P1** | Audit & Documentation | 🔴 Immediate | ✅ Complete |
| **P2** | Navigation & UX | 🟠 High | 🔄 In Progress |
| **P3** | DB Schema & Tenant Safety | 🟠 High | ⏳ Planned |
| **P4** | Lead Engine | 🟠 High | ⏳ Planned |
| **P5** | Resume Engine | 🟡 Medium | ⏳ Planned |
| **P6** | LinkedIn Assistant | 🟡 Medium | ⏳ Planned |
| **P7** | Tenant Onboarding Automation | 🟡 Medium | ⏳ Planned |
| **P8** | Error Handling & Reliability | 🟠 High | ⏳ Planned |
| **P9** | Backup & Rollback | 🟠 High | ⏳ Planned |
| **P10** | Performance Optimization | 🟡 Medium | ⏳ Planned |
| **P11** | E2E Testing | 🟡 Medium | ⏳ Planned |
| **P12** | Marketing Page | 🔵 Low | ⏳ Planned |
| **P13** | Documentation | 🔵 Low | ⏳ Planned |
| **P14** | Git & Deployment Safety | 🟡 Medium | ⏳ Planned |

---

## P0 — Critical Security Fixes (Immediate)

### What to Fix

**C1 — AI controller: job lookup without tenantId**
```typescript
// BEFORE (cross-tenant risk):
const job = await this.prisma.job.findFirst({ where: { id: dto.jobId } });
// AFTER (tenant-safe):
const job = await this.prisma.job.findFirst({ where: { id: dto.jobId, tenantId: user.tenantId } });
```

**C2 — Missing CANDIDATE_SCREENING WorkflowType**
```prisma
// Add to WorkflowType enum in schema.prisma:
CANDIDATE_SCREENING
```

**C3 — Plaintext credential storage**
- Encrypt config JSON before storing (AES-256-GCM)
- Never return credential fields in list responses
- Use `credentialsEnc` field (already in schema, never used)

**C4 — Insecure JWT secret fallback**
```typescript
// Throw at startup if JWT_SECRET is missing or insecure default:
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'insecure-default-secret') {
  throw new Error('JWT_SECRET env var is required and must be changed from default');
}
```

**C5 — Register dead processors**
- Register `dedupe`, `enrichment`, `outreach` queues with BullModule
- Add processors to their module's `providers[]` array

**C6 — AI service: application.updateMany without tenantId**
```typescript
// BEFORE:
await this.prisma.application.updateMany({ where: { candidateId, jobId }, data: ... });
// AFTER:
await this.prisma.application.updateMany({ where: { candidateId, jobId, tenantId }, data: ... });
```

**C7 — Import processor: verify tenantId from DB**
```typescript
// Re-fetch tenantId from DB, never trust job payload
const importRecord = await this.prisma.sourceImport.findUnique({ where: { id: importId } });
const tenantId = importRecord.tenantId; // use this, not job.data.tenantId
```

**C8 — Cross-tenant login**
```typescript
// If tenantSlug not provided and email matches multiple users, throw error requiring tenantSlug
```

**C9 — Swagger in production**
```typescript
// Gate Swagger:
if (nodeEnv !== 'production') { SwaggerModule.setup(...) }
```

**C10 — n8n wrong port**
- Update all 5 workflow JSON files: `http://backend:4000` → `http://backend:3001`

---

## P2 — Navigation & UX

### New Sidebar Structure

```
Dashboard

── Recruitment ──────────────────
  Candidates
  Jobs
  Applications
  AI Screening
  Resume Imports

── Sales ────────────────────────
  Leads
  Companies
  Contacts
  Outreach
  Pipeline

── Automations ──────────────────
  Imports
  Workflows
  Integrations
  Logs / Errors

── Analytics ────────────────────

── Settings ─────────────────────
  Billing
  Tenant Settings
  Users & Roles
  API Keys
  Visa Guide
  Help
```

### New Pages to Create
- `/applications` — Kanban board showing candidate application pipeline
- `/workflows` — Workflow run history with status/retry
- `/integrations` — Integration registry with test connection UI
- `/users` — User management (TENANT_ADMIN+ only)
- `/errors` — Error log viewer
- `/linkedin` — LinkedIn Assistant content tools
- `/onboarding` — New tenant guided setup

---

## P3 — DB Schema & Tenant Safety

### Schema Changes (Additive Only)

1. **Add `CANDIDATE_SCREENING` to `WorkflowType` enum** — migration required
2. **Add `deletedAt DateTime?` to Job, Company, Contact, IcpProfile** — soft delete
3. **Add `Tenant` relation to Contact, Scorecard, Activity, IcpProfile** — referential integrity
4. **Add `@@unique([tenantId, email])` to Contact** — dedup enforcement
5. **Add `webhookLogs` table** — audit trail for incoming webhook calls
6. **Add connection limit to DATABASE_URL** — `?connection_limit=10&pool_timeout=30`

### All changes must be:
- Additive (never remove columns)
- Run through `prisma migrate dev --name <descriptive-name>`
- Backed up pre-migration via `scripts/backup-db.sh`

---

## P4 — Lead Engine

### New Features

**Source Types to Add:**
- Google Maps (via Apify Actor API) → webhook → ImportRow pipeline
- CSV upload → existing pipeline (enhance with lead-specific mapping)
- Manual entry form → `/leads/new`
- Webhook/API passthrough → existing `/webhooks/lead-imported`

**New UI Components:**
- Import preview table with column mapping
- Row-level error display with retry button
- Lead scoring badge
- Source tag filter
- Batch tracking dashboard

**New Backend:**
- `LeadImportService` — dedicated lead import flow separate from candidate imports
- `ApifyService` — Google Maps scrape via Apify SDK
- Lead deduplication by email + phone + company name

---

## P5 — Resume Engine

### New Features

**Upload Sources:**
- File upload form (PDF/DOCX) on candidates page
- Bulk CSV with name/email + upload field
- Manual entry with AI field extraction

**Pipeline Enhancement:**
- AI field extraction from resume text (already exists in `/ai/parse-resume`)
- Duplicate detection before creating candidate
- JD matcher — score resume against open jobs
- Import log with success/fail per file

---

## P6 — LinkedIn Assistant (Safe, No Automation)

### Tools to Build (AI-only, user-posts-manually)

1. **Post Generator** — generates post from topic/URL/notes
2. **Caption Generator** — short caption ideas
3. **Hashtag Generator** — relevant hashtag sets
4. **Comment Suggestion** — response ideas for industry posts
5. **Connection Note Generator** — personalized connection requests
6. **DM Draft** — follow-up message generator
7. **Daily Action Dashboard** — planned actions for the day (manual checklist)

### Implementation
- New page: `/linkedin`
- New module: `backend/src/modules/linkedin/`
- Uses existing `AiProviderService`
- No external LinkedIn API calls — purely AI text generation

---

## P7 — Tenant Onboarding Automation

### On New Tenant Creation

1. Create tenant record
2. Create TENANT_ADMIN user
3. Create default ICP profile
4. Create default mapping templates (3 presets)
5. Create starter workflow configs
6. Email welcome message (when SMTP added)
7. Log onboarding to AuditLog

### Requirements
- Full transaction rollback on any step failure
- Idempotent — safe to re-run
- Event: `tenant.created` → triggers onboarding workflow

---

## P8 — Error Handling & Reliability

### Add to Backend

1. **Global HTTP exception filter** — maps Prisma errors to clean API responses
2. **Structured error response format** — `{ error: { code, message, details } }`
3. **Dead-letter queue** — failed Bull jobs move to `dlq` queue for manual review
4. **Integration health checker** — periodic ping for configured integrations
5. **Timeout handling** on all external calls (AI, webhooks) — 30s max
6. **Admin alert events** — emit `system.error` events for critical failures

### Frontend

1. **Error boundary** on all pages
2. **Toast notification system** — show errors, retries, successes
3. **Retry button** on failed operations
4. **Integration status indicator** in sidebar

---

## P9 — Backup & Rollback

### Scripts to Add

```bash
scripts/
  backup-db.sh        # Full PostgreSQL dump with timestamp
  restore-db.sh       # Restore from backup file
  pre-deploy.sh       # backup + migrate + build
  rollback.sh         # Restore from last backup + revert migration
  verify-health.sh    # Check all service health endpoints
```

### Deployment Flow

```
1. ./scripts/backup-db.sh → timestamped backup
2. prisma migrate deploy → run pending migrations
3. docker-compose build → build new images
4. docker-compose up -d → deploy
5. ./scripts/verify-health.sh → confirm all services OK
6. [if fail] ./scripts/rollback.sh → restore + revert
```

---

## P10 — Performance (4GB Server)

### Optimizations

1. **Analytics caching** — Redis TTL 5min on all analytics queries
2. **Paginate all list endpoints** — default 25, max 100
3. **Replace in-memory aggregation** with PostgreSQL GROUP BY
4. **JwtStrategy cache** — cache user DB lookup in Redis for 60s (per token)
5. **AI endpoint rate limiting** — per-user per-minute limit on AI endpoints
6. **Import streaming** — process rows in batches of 100 (already partially done)
7. **DB connection limit** — add `?connection_limit=10` to DATABASE_URL
8. **Docker memory limits** — explicit per-service limits in compose files

---

## P11 — E2E Testing

### Test Coverage Plan

| Flow | Tool | Priority |
|---|---|---|
| Login / logout | Playwright | 🔴 High |
| Tenant creation + onboarding | Jest / Supertest | 🔴 High |
| Lead import (CSV) | Jest / Supertest | 🔴 High |
| Resume upload + parse | Jest / Supertest | 🟠 Medium |
| AI screening flow | Jest / Supertest | 🟠 Medium |
| Outreach generation | Jest / Supertest | 🟠 Medium |
| Dashboard load | Playwright | 🟡 Low |
| Billing plan change | Jest / Supertest | 🟡 Low |

---

## P12 — Marketing Page

### Updates Needed

1. **Hero section** — clear value proposition (AI recruiting + sales automation)
2. **Feature highlights** — Lead Engine, Resume Engine, AI Screening, LinkedIn Assistant
3. **Pricing section** — link to `/pricing` with correct plan details
4. **CTA** — "Start Free Trial" → `/login?signup=true`
5. **Performance** — image optimization, Core Web Vitals

---

## P13 — Documentation

Files to update/create:

- `README.md` — updated setup guide
- `ARCHITECTURE.md` — updated system diagram + tech decisions
- `DEPLOYMENT.md` — step-by-step production deploy
- `DATABASE.md` — schema reference + migration guide
- `BACKUP.md` — backup/restore procedures
- `TESTING.md` — how to run tests locally
- `CHANGELOG.md` — version history

---

## P14 — Git & Deployment

### Commit Convention

```
type(scope): description

Types: feat, fix, security, perf, refactor, test, docs, chore
Scopes: auth, leads, candidates, ai, billing, ui, db, infra

Examples:
feat(leads): add Google Maps import via Apify
fix(auth): add tenantId to job lookup in AI screening — closes cross-tenant risk
security(integrations): encrypt credentials before storage
```

### Branch Strategy

```
main          → production
develop       → staging / integration
feature/*     → individual features
fix/*         → bug fixes
security/*    → security patches (merge immediately to main)
```

### Pre-Deploy Checklist

- [ ] DB backup completed
- [ ] Migrations tested on dev DB
- [ ] Tests pass
- [ ] Env vars verified
- [ ] Health check passes after deploy
- [ ] Rollback plan ready

---

*See [AUDIT.md](AUDIT.md) for full audit findings and risk matrix.*
