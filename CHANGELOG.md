# Changelog

All notable changes to the SRP AI Labs Recruitment + Sales Agentic Automation Platform.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.0.0] — 2026-06-01

### Security — Critical Fixes

- **C1** Enforced `tenantId` scoping on all AI controller job lookups (cross-tenant isolation)
- **C2** Added `CANDIDATE_SCREENING` to `WorkflowType` enum + migration `20260323000001`
- **C3** Added `GlobalExceptionFilter` mapping Prisma errors (P2002/P2025/P2003) to HTTP 409/404/400
- **C4** `auth.config.ts` now throws at startup if `JWT_SECRET` is missing or fewer than 32 characters
- **C5** Registered missing BullMQ processors (`DedupeProcessor`, `EnrichmentProcessor`, `OutreachProcessor`) in `app.module.ts`
- **C6** Added `tenantId` scoping to `applications.updateMany` — prevented cross-tenant mutation
- **C7** Removed raw password value from authentication log entries
- **C8** Resolved multi-user email ambiguity — login flow now requires `tenantSlug` for scoping
- **C9** Swagger UI disabled in production (`NODE_ENV !== 'production'`)
- **C10** Fixed all 5 n8n workflow JSON files: backend URL `4000 → 3001`

### Security — High / Medium Priority

- **H1** Separated unauthenticated `/health` (public ping) from authenticated `/api/v1/health` (dependency status)
- **H2** Secure refresh token rotation with 7-day expiry
- **H3** `@nestjs/throttler` rate limiting on `POST /auth/login` and `POST /auth/register`
- **H4** Resume upload validates MIME type + extension (PDF, DOCX whitelist)
- **H5** `ALLOWED_ORIGINS` env var enforced — wildcard `*` disallowed in production
- **H6** HTTP security headers applied via `@nestjs/helmet`
- **H8** `AuditService` logs create/update/delete with actor ID, IP, resource, and payload diff
- **M1** Idempotent `upsert` patterns replacing `findFirst + create` across 3 services (TOCTOU fix)
- **M2** `bcrypt.compare` called for non-existent user paths to prevent email enumeration timing attacks

### Added

#### Backend
- `GET /api/v1/health` — `HealthModule` with live DB + Redis latency checks
- `POST /api/v1/ai/linkedin` — LinkedIn AI content generation (6 content types)
- `POST /api/v1/tenants/:id/onboard` — Re-run idempotent tenant onboarding
- `TenantOnboardingService` — Seeds default mapping templates, ICP profile, prompt template on tenant creation
- `CacheService` (global) — ioredis-based cache with graceful degradation; `getOrSet` helper
- Dead Letter Queue — failed BullMQ jobs persisted to `WorkflowRun` table with `status = 'FAILED'`
- `LINKEDIN_CONTENT` added to `AiServiceType` enum
- Soft-delete `deletedAt DateTime?` on `Job`, `Company`, `Contact`, `IcpProfile` + partial indexes

#### Frontend
- `/applications` — Application tracking with status filter tabs (7 statuses)
- `/contacts` — Sales CRM contact list with search and table view
- `/workflows` — Workflow run history with status badges and durations
- `/integrations` — Integration registry card grid (n8n, OpenRouter, SMTP, Google Maps, Apify, LinkedIn AI)
- `/errors` — Error log viewer with level filter (ERROR/WARN/INFO) and expandable stack traces
- `/users` — User management table with role guard (admin-only)
- `/linkedin` — LinkedIn AI assistant with 6 content type tabs and copy button
- Sidebar rewritten with grouped, collapsible navigation (Recruitment | Sales | Automations | Settings groups)

#### Scripts
- `scripts/backup-db.sh` — pg_dump with timestamp, auto-prune to 7 backups
- `scripts/restore-db.sh` — Drop/recreate schema, restore from backup file
- `scripts/pre-deploy.sh` — Backup DB + pull latest + run migrations + build
- `scripts/verify-health.sh` — Curl health endpoints with 10-retry / 5s interval logic
- `scripts/rollback.sh` — Full rollback: stop → restore DB → restart → verify health

### Changed

- `analytics.service.ts` — All 4 analytics methods wrapped in Redis `cache.getOrSet()` (2–5 min TTL)
- `processors/dedupe.processor.ts` — `@OnQueueFailed` now persists FAILED `WorkflowRun` (DLQ)
- `processors/enrichment.processor.ts` — `@OnQueueFailed` now persists FAILED `WorkflowRun` (DLQ)
- `processors/outreach.processor.ts` — `@OnQueueFailed` now persists FAILED `WorkflowRun` (DLQ)
- `tenants.service.ts` — Fires `TenantOnboardingService.setup()` after tenant creation (fire-and-forget)
- `app.module.ts` — Registered `HealthModule`, `AppCacheModule` (global)
- Sidebar brand name updated to **SRP AI Labs**

### Database Migrations

| Migration | Description |
|-----------|-------------|
| `20260323000001_candidate_screening_workflow_type` | Adds `CANDIDATE_SCREENING` to `WorkflowType` enum |
| `20260323000002_soft_delete_and_tenant_relations` | Adds `deletedAt` to 4 tables, partial indexes, `LINKEDIN_CONTENT` enum value |

---

## [1.3.0] — 2026-03-18 (Round 3 Fixes)

### Fixed

- **Visa Guide shows "0 visa types"** — `prisma db seed` now upserts all 16 visa rules across 7 countries on every deploy
- **JD Parser returns nothing** — Frontend `aiApi.parseJd` now sends `{ jobDescription }` (was `{ text }`); backend accepts both fields for backward compat
- **AI Screen PDF/Word upload error** — `POST /ai/parse-resume` now returns `{ resumeText, charCount }` instead of calling JD parser
- **AI Screen "Run AI Screening" fails** — `jobDescription` made optional; backend auto-fetches from DB using `jobId` when omitted
- **Import page "Import failed"** — Frontend now sends correct `ImportSource` enum: `.csv → CSV`, `.xlsx/.xls → EXCEL`, PDF/Word → `MANUAL`
- **Import fails uppercase enum** — `'candidate'` (lowercase) enforced throughout import flow
- **Billing shows NaN%** — `UsageMeter` now guards against `limit = 0` division; shows "No active plan" when no subscription
- **Enterprise plan shows $0** — Plan cards show "Custom" pricing when `tier === 'ENTERPRISE'`
- **Settings no API key guidance** — Per-provider help banners with direct links (Apollo, LinkedIn, Hunter, Clearbit, etc.)
- **Candidate email opens native client** — "AI Email" button replaced with outreach modal (AI-generated subject + body, Copy + Open in email client)
- **AI Screen no file upload on server** — Deployed latest `ai/screen/page.tsx` and rebuilt frontend container
- **Landing page old prices** — Deployed latest `page.tsx` (Free / $19 / $49 / Custom tiers)

---

## [1.2.0] — Previous Session (Round 2 Fixes)

### Fixed

- Companies page shows wrong total count (`data?.total` → `data?.meta?.total`)
- Jobs page "not found" on empty state → "Post your first job" empty state card
- Leads page confusing AI Score/Stage → rewritten with stage labels + AI Score explanation banner
- Missing `leads/new/page.tsx` — created new lead form
- Missing `leads/[id]/page.tsx` — created lead detail page
- Imports page 2-step confusing UX → single drag-and-drop (create + upload in one step)
- Dashboard all zeros → "Get Started" 3-step quickstart guide when all metrics are 0

---

## [1.0.0] — Initial Release

- Multi-tenant NestJS + Next.js platform
- Recruitment pipeline: candidates, jobs, applications, AI screening
- Sales pipeline: leads, companies, contacts, outreach sequences
- n8n automation workflows (5 workflows)
- Billing with Stripe-ready tier structure
- Visa Guide with rules for 7 countries
- AI provider integration (OpenRouter/OpenAI)
- BullMQ job queues (import, dedupe, enrichment, outreach)
- JWT auth with role-based access (SUPER_ADMIN, TENANT_ADMIN, RECRUITER, SALES_REP)
