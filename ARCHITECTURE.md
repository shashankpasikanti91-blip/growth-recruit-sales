# System Architecture

## Overview

The Recruitment + Sales Agentic Automation Platform is a multi-tenant SaaS system that combines an AI-powered recruitment pipeline with a sales CRM and automated outreach engine. All automation is orchestrated via n8n, with the NestJS backend serving as the single source of truth.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser / Client                              │
└────────────────────────┬────────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Reverse Proxy (Nginx / Caddy)                     │
│          yourdomain.com → :3000   api.yourdomain.com → :3001        │
└──────────────┬──────────────────────────────┬───────────────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────┐        ┌─────────────────────────────────────┐
│   Next.js 14 Frontend│        │        NestJS REST API (v1)          │
│   (App Router, SSR)  │        │  /api/v1/*  Swagger: /api/docs       │
│   Port 3000          │        │  Port 3001                           │
│                      │        │                                       │
│  TanStack Query      │◄──────►│  Modules:                            │
│  Zustand Auth Store  │  JWT   │  Auth, Tenants, Users, Countries      │
│  Recharts            │        │  Candidates, Jobs, Applications       │
│  React Hook Form     │        │  Leads, Companies, Contacts           │
│  Tailwind CSS        │        │  AI, Imports, Outreach, Webhooks      │
│  Radix UI            │        │  Mappings, Audit, Analytics           │
└──────────────────────┘        │  Workflows, Integrations             │
                                └───────┬──────────────┬──────────────┘
                                        │              │
                          ┌─────────────┘              └──────────────┐
                          ▼                                            ▼
              ┌──────────────────────┐                 ┌──────────────────────┐
              │   PostgreSQL 16      │                 │     Redis 7           │
              │   Port: 5432         │                 │     Port: 6379        │
              │                      │                 │                       │
              │  27 Prisma models    │                 │  BullMQ Queues:       │
              │  11 enums            │                 │  - import-processing  │
              │  Multi-tenant rows   │                 │  - enrichment         │
              └──────────────────────┘                 │  - outreach           │
                                                       │  - dedupe             │
                                                       └──────────────────────┘
                                                                │
                                                                │ Worker Processes
                                                                ▼
                                              ┌────────────────────────────────┐
                                              │       BullMQ Processors         │
                                              │  enrichment.processor.ts        │
                                              │  outreach.processor.ts          │
                                              │  dedupe.processor.ts            │
                                              └────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          n8n (Port 5678)                             │
│                                                                       │
│  Workflow 01: Candidate Import (LinkedIn / Indeed → backend)          │
│  Workflow 02: Lead Import (Apollo / Hunter / CSV → backend)           │
│  Workflow 03: Auto AI Screening (on candidate.imported)               │
│  Workflow 04: Outreach Sequence Executor (send emails + LinkedIn)     │
│  Workflow 05: Lead Enrichment + Auto-Outreach (on lead.imported)      │
│                                                                       │
│  All n8n → backend calls use X-N8N-Secret header auth                │
│  All backend → n8n calls emit events then n8n polls/listens           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     AI Services Layer                                 │
│                                                                       │
│  Provider: OpenAI (gpt-4o) or OpenRouter (any model)                 │
│                                                                       │
│  Services:                                                            │
│  - ResumeScreeningService   (6-step scoring pipeline)                │
│  - OutreachGenerationService (single + sequence generation)           │
│  - LeadScoringService       (ICP-based scoring + pain points)        │
│  - JdParserService          (JD text → structured JSON)              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Module Dependency Map

```
AppModule
├── ConfigModule (global)
├── EventEmitterModule (global)
├── BullModule (global queues)
├── PrismaModule (global)
├── AuditModule (@Global)
│   └── EventEmitter2 listeners
├── WorkflowsModule (@Global)
│   └── EventEmitter2 listeners
├── AuthModule
│   ├── UsersModule
│   └── PassportModule + JwtModule
├── TenantsModule
├── CountriesModule
├── AiModule
│   ├── AiProviderService
│   ├── ResumeScreeningService
│   ├── OutreachGenerationService
│   ├── LeadScoringService
│   └── JdParserService
├── CandidatesModule
│   └── AiModule
├── JobsModule
│   └── AiModule
├── ApplicationsModule
│   ├── CandidatesModule
│   ├── JobsModule
│   └── AiModule
├── ImportsModule
│   └── BullMQ (import-processing queue)
├── MappingsModule
├── LeadsModule
│   └── AiModule
├── CompaniesModule
├── ContactsModule
├── OutreachModule
│   └── AiModule
├── WebhooksModule
│   ├── ApplicationsModule
│   ├── LeadsModule
│   └── OutreachModule
├── AnalyticsModule
└── IntegrationsModule
```

---

## Data Flow: Candidate Screening

```
1. CSV / API import
       │
       ▼
ImportsModule (BullMQ: import-processing)
       │ validates & persists rows
       ▼
CandidateModule.create()
       │ emits: candidate.imported
       ▼
n8n Workflow 03 (webhook: on-candidate-imported)
       │ waits 2s, fetches open jobs
       ▼
POST /webhooks/trigger-screening  (X-N8N-Secret)
       │
       ▼
WebhooksController → ApplicationsService.screenApplication()
       │
       ├── ResumeScreeningService (6-step AI pipeline)
       │       ├── Step 1: Extract candidate profile
       │       ├── Step 2: Match against JD + country rules
       │       ├── Step 3: Score 0-100
       │       ├── Step 4: Decision (Strong Shortlist / Shortlist / KIV / Rejected)
       │       ├── Step 5: JSON output
       │       └── Step 6: Recruiter summary
       │
       └── AiService.persistScreeningResult()
               ├── AiAnalysisResult (full AI response)
               ├── Scorecard (per-dimension scores)
               ├── Application.stage updated
               ├── Candidate.stage synced
               └── AiUsageLog (tokens + cost)
```

---

## Data Flow: Lead → Outreach

```
1. Apollo / Manual input
       │
       ▼
LeadsModule.create()
       │ emits: lead.imported
       ▼
n8n Workflow 05 (webhook: on-lead-imported)
       │
       ▼
POST /webhooks/score-lead
       │
       ▼
LeadScoringService (ICP match → 0-100 score)
       │
       ├─ score < 70 → SKIP
       │
       └─ score ≥ 70
               │
               ▼
       POST /webhooks/trigger-outreach
               │
               ▼
       OutreachService.generate()
               │
               ├── OutreachGenerationService (AI: subject+body, 3 steps)
               ├── OutreachSequence created
               └── OutreachMessages[1-3] (PENDING)
                       │
                       ▼
               n8n Workflow 04 (polls every 30min)
                       │ sends via SMTP or LinkedIn
                       ▼
               POST /webhooks/message-status
                       │
                       ▼
               OutreachMessage.status = SENT
```

---

## Authentication & Multi-Tenancy

- All API requests require a JWT `Bearer` token in the `Authorization` header (except `/auth/*`).
- JWT payload: `{ sub: userId, tenantId, role, email }`.
- Every service method receives `tenantId` from the JWT and applies it as a Prisma `where` filter — cross-tenant data access is impossible at the service layer.
- Refresh tokens are stored hashed in `RefreshToken` table. Token rotation: each refresh invalidates the old token and issues a new pair.
- Roles: `SUPER_ADMIN > TENANT_ADMIN > RECRUITER / SALES > VIEWER`.

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| SQL Injection | Prisma parameterised queries — raw SQL never used |
| XSS | React auto-escapes, Helmet sets CSP headers |
| CSRF | JWT in Authorization header (not cookies) avoids CSRF |
| n8n webhook forgery | `X-N8N-Secret` header verified on every webhook endpoint |
| Secrets in logs | Credentials stored in `Integration.encryptedCredentials` (encrypt at rest in production) |
| SSRF via integration URLs | Integration URLs validated to known provider domains |
| Brute force login | Rate limiting on `/auth/login` via `@nestjs/throttler` |
| Multi-tenant data leak | `tenantId` filter on every Prisma query in service layer |

---

## File Structure

```
.
├── docker-compose.yml
├── .env.example
├── DEPLOYMENT.md
├── ARCHITECTURE.md
├── N8N_GUIDE.md
├── readme.md
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # 27 models, 11 enums
│   │   └── seed.ts
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── config/
│       ├── modules/
│       │   ├── auth/
│       │   ├── tenants/
│       │   ├── users/
│       │   ├── countries/
│       │   ├── ai/
│       │   ├── candidates/
│       │   ├── jobs/
│       │   ├── applications/
│       │   ├── imports/
│       │   ├── leads/
│       │   ├── companies/
│       │   ├── contacts/
│       │   ├── outreach/
│       │   ├── webhooks/
│       │   ├── mappings/
│       │   ├── audit/
│       │   ├── analytics/
│       │   ├── workflows/
│       │   └── integrations/
│       └── processors/
│           ├── enrichment.processor.ts
│           ├── outreach.processor.ts
│           └── dedupe.processor.ts
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (dashboard)/
│       │   │   ├── layout.tsx
│       │   │   ├── dashboard/
│       │   │   ├── candidates/
│       │   │   ├── jobs/
│       │   │   ├── leads/
│       │   │   ├── companies/
│       │   │   ├── imports/
│       │   │   ├── outreach/
│       │   │   ├── ai/screen/
│       │   │   ├── analytics/
│       │   │   └── settings/
│       │   ├── login/
│       │   └── page.tsx
│       ├── components/
│       │   ├── layout/sidebar.tsx
│       │   └── providers/
│       ├── lib/
│       │   ├── api.ts             # Axios + refresh interceptor
│       │   └── api-client.ts      # Typed API methods
│       ├── store/
│       │   └── auth.store.ts      # Zustand persist
│       └── middleware.ts          # Route protection
│
└── n8n/
    └── workflows/
        ├── 01-candidate-import.json
        ├── 02-lead-import.json
        ├── 03-auto-screening.json
        ├── 04-outreach-sequence.json
        └── 05-lead-enrichment.json
```
