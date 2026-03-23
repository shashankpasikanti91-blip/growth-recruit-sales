# Full System Audit Report
**Platform:** SRP AI Labs — Recruitment + Sales Agentic Automation Platform  
**Audit Date:** March 23, 2026  
**Status:** Phase 1 Complete — Implementation In Progress

---

## Executive Summary

The platform has a **solid architectural foundation**: a well-normalized PostgreSQL schema (~30 models), proper JWT rotation, a capable multi-step AI pipeline, tenant-scoped queries across most modules, and sensible Docker/Nginx infrastructure. However, a set of **critical security and reliability issues** must be resolved before production traffic, alongside several **missing features** that are essential for the stated purpose of the platform.

---

## Current System State

### What Exists ✅

| Area | Status | Notes |
|---|---|---|
| Multi-tenant schema | ✅ Solid | ~30 models, UUIDs, tenant_id everywhere |
| JWT auth + refresh rotation | ✅ Working | 15m access / 7d refresh |
| Candidate CRUD | ✅ Working | With activity logging |
| Job CRUD + AI JD parsing | ✅ Working | |
| Lead CRUD + scoring | ✅ Partial | countryCode filter broken |
| CSV/XLSX import pipeline | ✅ Working | Bull queue, retry logic |
| AI resume screening | ✅ Working | 6-step pipeline, persisted results |
| AI outreach generation | ✅ Working | Multi-step sequences |
| n8n workflow automation | ⚠️ Partial | Wrong port in workflow configs |
| Docker Compose (dev + prod) | ✅ Working | RAM-optimized for 4GB |
| Nginx reverse proxy | ✅ Working | TLS, rate limiting |
| Analytics dashboards | ✅ Working | Performance issues at scale |

### What's Missing ❌

| Feature | Priority | Notes |
|---|---|---|
| Background processors (dedupe, enrichment, outreach) | 🔴 Critical | Dead code — never registered |
| Stripe webhook handler | 🔴 High | Billing data never syncs from Stripe |
| Email/SMTP sending | 🔴 High | Outreach status set manually, no dispatch |
| File storage (S3/object storage) | 🟠 Medium | Files parsed in-memory, never persisted |
| Password reset / forgot password | 🟠 Medium | No endpoint exists |
| Email verification on signup | 🟡 Low | Users immediately active |
| WebSocket / real-time notifications | 🟡 Low | Nginx config exists, no NestJS gateway |
| GDPR data export / erasure | 🟡 Low | No endpoint |
| LinkedIn Assistant | ❌ Missing | Planned — Phase 6 |
| Google Maps / Apify lead import | ❌ Missing | Planned — Phase 4 |
| Nightly deduplication runs | ❌ Missing | Processor exists but never runs |
| Global exception filter | 🔴 High | Raw Prisma errors leak to client |
| Audit log coverage | 🟠 Medium | Only application events logged |
| Plan limit enforcement | 🟠 Medium | Limits shown but not enforced |

---

## Critical Issues (Fix Before Any Production Traffic)

### C1 — Cross-Tenant AI Job Lookup
**File:** `backend/src/modules/ai/ai.controller.ts` line 110  
**Risk:** User from Tenant A can screen resumes against jobs from Tenant B  
**Fix:** Add `tenantId` filter to `prisma.job.findFirst()` call  

### C2 — Missing Prisma Enum Value
**File:** `backend/src/modules/workflows/workflows.service.ts` line 58  
**Risk:** `CANDIDATE_SCREENING` WorkflowType not in Prisma schema → runtime error on every application screening  
**Fix:** Add `CANDIDATE_SCREENING` to `WorkflowType` enum in schema.prisma + migrate  

### C3 — Credentials Stored Plaintext
**File:** `backend/src/modules/integrations/integrations.service.ts`  
**Risk:** API keys, passwords in `config` JSON column stored unencrypted  
**Fix:** Encrypt sensitive fields using AES-256-GCM before storing; strip secrets from GET responses  

### C4 — Insecure JWT Secret Fallback
**File:** `backend/src/config/auth.config.ts`  
**Risk:** If `JWT_SECRET` env var missing, app starts with `'insecure-default-secret'` — token forgery possible  
**Fix:** Throw on startup if JWT_SECRET is missing or too short  

### C5 — Dead Background Processors
**Files:** `backend/src/processors/dedupe.processor.ts`, `enrichment.processor.ts`, `outreach.processor.ts`  
**Risk:** All three processors are never instantiated — deduplication, enrichment, and outreach queue jobs never run  
**Fix:** Register queues in BullModule and add processors to appropriate module providers  

### C6 — Cross-Tenant Application Update
**File:** `backend/src/modules/ai/ai.service.ts` line 56  
**Risk:** `application.updateMany({ where: { candidateId, jobId } })` has no `tenantId` filter  
**Fix:** Add `tenantId` to the where clause  

### C7 — Processor Trusts Redis Payload for tenantId
**File:** `backend/src/processors/import.processor.ts` (if it exists separately from imports module)  
**Risk:** Tampered Redis job payload could process import rows under wrong tenant  
**Fix:** Always re-fetch and verify `tenantId` from DB record, use DB value not payload  

### C8 — Cross-Tenant Login via Email-Only
**File:** `backend/src/modules/auth/auth.service.ts`  
**Risk:** Login without `tenantSlug` matches first user by email across ALL tenants  
**Fix:** Require `tenantSlug` or enforce global email uniqueness  

### C9 — Swagger Publicly Exposed in Production
**File:** `backend/src/main.ts` line 57 — `if (true)` hardcoded  
**Risk:** Full API schema, routes, and DTOs visible to anyone  
**Fix:** Gate Swagger behind `NODE_ENV !== 'production'` or add HTTP Basic auth  

### C10 — Wrong Backend Port in n8n Workflows
**File:** `n8n/workflows/01-candidate-import.json`  
**Risk:** n8n workflows call `http://backend:4000` but backend runs on port 3001 — all automation fails  
**Fix:** Update all workflow JSON files to use port 3001  

---

## High Priority Issues 

| ID | Location | Issue | Fix |
|---|---|---|---|
| H1 | `tenants.controller.ts` | `TENANT_ADMIN` can read/update ANY tenant | Add ownership check |
| H2 | `leads.service.ts` | `countryCode` filter accepted but silently ignored | Apply filter in Prisma where clause |
| H3 | `outreach.service.ts` | Suppression list not checked before outreach generation | Call `checkSuppression()` first |
| H4 | `billing.service.ts` | No Stripe webhook handler | Implement `/billing/webhook` with Stripe SDK |
| H5 | `billing.controller.ts` | `changePlan()` accessible by any role | Add `RolesGuard` with `TENANT_ADMIN` minimum |
| H6 | `candidates.controller.ts` | No RolesGuard — VIEWER can create/modify candidates | Add role check |
| H7 | `auth.service.ts` | No brute-force protection on login | Add rate limiting or lockout |
| H8 | `imports.service.ts` | No MIME-type validation | Add `fileFilter` to `FileInterceptor` |
| H9 | `billing.service.ts` | Plan limits not enforced | Check limits before create operations |

---

## Medium Priority Issues

| ID | Location | Issue |
|---|---|---|
| M1 | Multiple services | TOCTOU: update uses `where: { id }` not `where: { id, tenantId }` |
| M2 | `webhooks.controller.ts` | Non-timing-safe secret comparison |
| M3 | `analytics.service.ts` | In-memory aggregation with large queries — no Redis caching |
| M4 | `audit.service.ts` | Most CRUD not audited; AuditLog deletable |
| M5 | `auth.service.ts` | Refresh token stored as plain UUID — should be hashed |
| M6 | `main.ts` | CORS allows localhost origins in production |
| M7 | `integrations.controller.ts` | `list()` returns raw config with credentials |

---

## Performance Risks (4GB Server)

| Area | Risk | Severity |
|---|---|---|
| `analytics.service.ts` | `candidate.findMany(take:1000)` for skill aggregation per page load | High |
| `analytics.service.ts` | All AI usage rows fetched for in-memory time-series | High |
| `outreach.generate()` | 5 sequential AI calls per HTTP request | High |
| `imports.service.ts` | 5000 rows `createMany` in one transaction | Medium |
| `JwtStrategy.validate()` | DB query on every authenticated request | Medium |
| Redis 64MB cap | Bull queues compete with future caching; LRU could drop queued jobs | High |
| Prisma connection | No `connection_limit` set in DATABASE_URL | Medium |

---

## Tenant Isolation Status

| Module | Read | Write | Risk |
|---|---|---|---|
| Candidates | ✅ | ⚠️ TOCTOU | Update without tenantId in where |
| Jobs | ✅ | ⚠️ TOCTOU | Update without tenantId in where |
| Leads | ✅ | ⚠️ TOCTOU + ❌ filter ignored | |
| Applications | ✅ | 🔴 Cross-tenant | updateMany without tenantId |
| Imports | ✅ service | ⚠️ processor | Processor trusts Redis payload |
| Outreach | ✅ | ✅ | Correct |
| Analytics | ✅ | N/A | tenantId passed through |
| Tenants CRUD | 🔴 | 🔴 | TENANT_ADMIN cross-tenant access |
| AI screen-resume | 🔴 | 🔴 | Job fetched without tenantId |
| Integrations | ✅ list | 🔴 | Plaintext credential exposure |

---

## Missing Frontend Pages/Routes

The following routes are needed but do not exist yet:

- `/applications` — Application tracking board
- `/workflows` — Workflow run history
- `/integrations` — Integration management
- `/errors` — Error log viewer
- `/users` — User & role management  
- `/linkedin` — LinkedIn Assistant tools
- `/onboarding` — Tenant onboarding flow

---

## What Was Already Done Well ✅

- PostgreSQL multi-tenant schema with proper indexes
- JWT rotation with 15-minute access tokens
- NestJS validation pipes with whitelist mode
- Bull queue with retry + exponential backoff
- Docker Compose with RAM limits for 4GB server
- Nginx with TLS, rate limiting, gzip
- n8n integration pattern (though config needs fixes)
- AI pipeline with result persistence and usage logging
- Role-based access control framework in place
- Import pipeline with row-level error tracking

---

*For the implementation plan, see [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)*
