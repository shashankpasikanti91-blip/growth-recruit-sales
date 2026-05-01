# SRP AI Growth — Documentation Index

**Project:** SRP AI Growth  
**Live Platform:** https://growth.srpailabs.com/  
**Swagger API Docs:** https://growth.srpailabs.com/api/docs  
**Powered by:** SRP AI Labs  
**Last Updated:** May 2026 (v3.1.0)

---

## Documents

| Document | Description |
|----------|-------------|
| [ROADMAP.md](ROADMAP.md) | **Phase-wise build plan** — what is done, what to build next, in what order |
| [modules/PLATFORM-ROLES.md](modules/PLATFORM-ROLES.md) | Role hierarchy — SUPER_ADMIN / TENANT_ADMIN / SALES / RECRUITER / VIEWER, page access matrix |
| [modules/RECRUITMENT.md](modules/RECRUITMENT.md) | Recruitment ATS — full module reference, real build status |
| [modules/SALES-CRM.md](modules/SALES-CRM.md) | Sales CRM — full module reference, real build status |
| [modules/SALES-RECRUITMENT-INTEGRATION.md](modules/SALES-RECRUITMENT-INTEGRATION.md) | How Sales + Recruitment connect, data mapping, phase build plan |
| [phases/PHASE-00-Core-Foundation.md](phases/PHASE-00-Core-Foundation.md) | Phase 00 — Sales CRM base, Recruitment ATS, Auth, Dashboard, Infrastructure |
| [phases/PHASE-01-Enterprise-Core.md](phases/PHASE-01-Enterprise-Core.md) | Phase 01 — Interview module, Offer module, Commercial Firewall (RBAC) |
| [phases/PHASE-02-Placement-Desk.md](phases/PHASE-02-Placement-Desk.md) | Phase 02 — Full Submissions, Interviews & Offers UI, Kanban board |
| [phases/PHASE-03-JD-Desk.md](phases/PHASE-03-JD-Desk.md) | Phase 03 — Recruiter assignment, Lead→Client conversion, Proposal 360 |
| [phases/PHASE-04-Candidate-360.md](phases/PHASE-04-Candidate-360.md) | Phase 04 — 19-status lifecycle engine, status history, onboarding checklist |
| [phases/PHASE-05-Talent-Search.md](phases/PHASE-05-Talent-Search.md) | Phase 05 — Boolean search, Talent Pools, Saved Searches |
| [phases/PHASE-06-Alerts-QA.md](phases/PHASE-06-Alerts-QA.md) | Phase 06 — Notification centre, cross-team alerts, feedback reminder cron, QA gate |
| [phases/PHASE-07-My-Hub.md](phases/PHASE-07-My-Hub.md) | Phase 07 — My Hub: personal workspace for Recruiter + Sales team members |
| [phases/PHASE-08-Connect.md](phases/PHASE-08-Connect.md) | Phase 08 — SRP Connect: Gmail OAuth, Outlook, WhatsApp, Telegram, Teams |
| [phases/PHASE-09-Reports-Analytics.md](phases/PHASE-09-Reports-Analytics.md) | Phase 09 — SRP Reports & Analytics: exports, custom dashboards, scheduled reports |
| [BRANCH_STRATEGY.md](BRANCH_STRATEGY.md) | Git branching model |
| [RELEASE_READINESS.md](RELEASE_READINESS.md) | Pre-release checklist |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Tech stack, infrastructure, n8n flows, server ports |

---

## Phase Status Dashboard

| Phase | SRP Name | Status |
|-------|----------|--------|
| **00** | SRP Core Foundation | ✅ DONE |
| **01** | SRP Enterprise Core — Interview, Offer & RBAC Engine | ✅ DONE |
| **02** | SRP Placement Desk — Full Submission & Interview UI | ✅ DONE |
| **03** | SRP JD Desk — Sales-to-Recruiter Handoff Polish | ✅ DONE |
| **04** | SRP Candidate 360 — Status Lifecycle & Onboarding | ✅ DONE |
| **05** | SRP Talent Search — Boolean & Talent Pool | ✅ DONE |
| **06** | SRP Cross-Team Alerts & QA | ✅ DONE |
| **07** | SRP My Hub — Team Productivity Layer | ✅ DONE |
| **08** | SRP Connect — Global Outreach Channels | ✅ DONE |
| **09** | SRP Reports & Analytics — Exports & Custom Dashboards | 🔶 NEXT |

Full task breakdown → [ROADMAP.md](ROADMAP.md)

---

## What Is Already Built (Phase 00 + 01 + 02)

### Sales CRM ✅
- Leads list + Lead 360, Generate Leads (AI/Apollo/Apify/CSV)
- Companies, Contacts, Client list + **Client 360** (8 tabs: Overview, JDs, Submissions, Opportunities, Contacts, Documents, Notes, Timeline — 6 KPI cards incl. Interviews + Offers)
- Opportunities, Follow-ups, Outreach sequences
- **Proposals list + new form** (DRAFT/SENT/UNDER_REVIEW/ACCEPTED/REJECTED/REVISED)
- ICP scoring (stored) · Lead stages · Full audit log

### Recruitment ATS ✅
- Candidates list (full table: AI score, stage, visa, skills, bulk screen, star rating)
- Candidate 360 (7 tabs: Overview, Resume, Applications, AI Screening, Notes, Timeline, **Submissions**)
- Jobs/JDs list (table + cards view), JD 360 (Overview + Applications tabs + **Submissions tab**)
- Applications list (table + **Kanban board** view), Submissions list + new form + **Kanban board** view
- Bulk AI Screening · Screening persistence (cached, no auto-rerun)
- AI Match/Screen page · LinkedIn sourcing · Visa Guide
- **Interviews** full page — schedule modal, feedback modal (rating 1-5, PASS/FAIL/HOLD, notes), status filter, 6-card stats grid
- **Offers** full page — create modal, decline reason modal, status transition buttons (PENDING→EXTENDED→ACCEPTED/DECLINED/WITHDRAWN), 6-card stats grid

### Platform & Operations ✅
- **Dashboard** — Role-based KPI cards (RECRUITER / SALES / Admin variants), Hiring Funnel, Lead Stages, AI usage
- **Analytics** — full Recharts (Area/Bar/Line/Pie), Sales + Recruitment combined + 4 new KPIs
- **Documents** — upload, signed URLs, type filter
- **Workflows** — n8n run list, pause/resume/retry
- **Imports** — CSV/API bulk import
- Integrations · Settings

### Admin ✅ (TENANT_ADMIN + SUPER_ADMIN only)
- **Billing** — usage meters, plan management (FREE → ENTERPRISE), payment modal
- **Users & Roles** — invite, role change, seat count
- **Audit Logs** — action + entity filters, change detail drawer

### Owner ✅ (SUPER_ADMIN only)
- **Owner Control Panel** — Tenants, Subscriptions, Signups, AI Usage (platform-wide)

### Infrastructure ✅
- Full Prisma schema (31 models, 13 enums) · 21 backend modules · Multi-tenant architecture
- JWT auth + refresh tokens · BullMQ queues · n8n workflows
- Nginx on `growth.srpailabs.com` · Cloudflare TLS · Production Docker Compose

---

## Phase 01 Built (Enterprise Core) ✅

### Backend Modules (NEW)
- **Interviews module** — Full CRUD: POST/GET/PUT/DELETE `/interviews` — mode, status, round, rating 1-5, result, feedback, multi-round
- **Offers module** — Full CRUD: POST/GET/PUT/DELETE `/offers` — status lifecycle (PENDING → EXTENDED → ACCEPTED/DECLINED/WITHDRAWN/EXPIRED), active conflict guard
- **Prisma migration** `20260420000001` — `interviews` + `offers` tables with FK constraints and indexes

### Commercial Firewall (RBAC)
- `billingRate` + `candidatePayRate` stripped at API level for RECRUITER role (`stripCommercial<T>()` utility)
- Recruiter JD scoping: `assignedRecruiterId` auto-filter when role === RECRUITER

### Submissions Enhancement
- `PUT /submissions/:id/client-feedback` — enter client interview feedback + update stage (Sales/Admin only)
- Submission create now emits `submission.created` EventEmitter2 event + logs activity

### Analytics (4 New KPIs)
- `submissionsTotal`, `submissionsThisWeek`, `activeClients`, `placementsThisMonth`

### Frontend
- Candidate 360 — new **Submissions** tab (stage badge, client/job, feedback quote, interview date)
- Dashboard — role-based KPI grid (3 variants: RECRUITER / SALES / Admin)
- API client: `interviewsApi`, `offersApi`, `submissionsApi.clientFeedback`

---

## Phase 02 Built (SRP Placement Desk) ✅

### Frontend — New Pages
- **`/interviews`** — full placement desk for interviews: 6-stat grid, schedule modal, feedback modal (1–5 stars, PASS/FAIL/HOLD), status filter tabs, paginated table, Sidebar link (Calendar icon)
- **`/offers`** — full offer management: 6-stat grid, create offer modal, decline reason modal, TRANSITIONS-based status action buttons, paginated table, Sidebar link (Star icon)

### Frontend — JD 360 Enhancement
- **Submissions tab** added to JD 360 (`/jobs/[id]`): Pipeline vs Submissions tab bar, client feedback preview, `ClientFeedbackModal` → `PUT /submissions/:id/client-feedback`

### Frontend — Client 360 Enhancement
- **8-tab layout**: added Contacts tab (primary + billing contact) and Documents tab (`documentsApi.list({ clientId })`)
- **6-card KPI row**: expanded from 4 → 6 cards, adding live Interviews + Offers counts per client

### Frontend — Submissions Kanban
- **Board view toggle** on `/submissions` page (List / Kanban icons in header)
- **10-column Kanban board**: one column per stage, cards with AI score bar, inline stage `<select>` → `submissionsApi.update()`

---

## What Is Next (Phase 03 — SRP JD Desk)

1. **Recruiter Assignment from JD 360** — "Assign Recruiter" button (Sales/Admin), searchable user dropdown, `PUT /jobs/:id { assignedRecruiterId }`, display assigned recruiter on header
2. **Lead → Client Conversion Flow** — "Convert to Client" button on Lead 360, pre-fills Client form, sets `lead.convertedToClientId`, redirects to new Client 360
3. **Lead 360: ICP Score Explanation Panel** — score breakdown (Company Fit, Title Fit, Industry, Country, Engagement) from `scoreDetails` JSON
4. **Proposal 360 (Detail View)** — `/proposals/:id` status tracker, DRAFT→SENT→UNDER_REVIEW→ACCEPTED/REJECTED, linked client backlink
5. **Offer Letter Upload** — MinIO signed URL upload → `offerLetterUrl` (deferred from Phase 02)

---

## Platform Overview

```
AI Lead Generation (Apollo / Apify / Google Maps / CSV)
         ↓
   Lead Scoring (ICP — stored + explanation)
         ↓
   Company / Contact enrichment
         ↓
   Convert Lead → Client (SRP-CL-XXXX)
         ↓
   Sales creates JD under Client (SRP-JD-XXXX)
         ↓
   Sales assigns Recruiter(s) to JD
         ↓
   Recruiter sees assigned JDs only
         ↓
   Candidate sourced + AI-screened vs JD
         ↓
   Application created (SRP-APP-XXXX) — unique Candidate × JD
         ↓
   Recruiter creates Submission (SRP-SUB-XXXX)
         ↓
   Sales sees submission in Client 360 / JD 360
         ↓
   Sales sends to Client → Client Feedback → Interview
         ↓
   Offer → Joined → Candidate.stage = PLACED
```

---

## Key Principles (All Modules)

1. **No wipe code.** Extend existing code. Never delete working routes or models.
2. **ID-first.** Records linked by `businessId`. Names / emails are display only.
3. **RBAC at API level.** Role enforcement in backend middleware — not just UI hiding.
4. **Commercial boundary is sacred.** Recruiters never receive `billingRate`, `candidatePayRate`, or `paymentTerms` in any API response.
5. **AI assists — never auto-acts.** Human confirmation required for re-runs, sends, and state changes.
6. **Audit everything.** Every state change writes to `audit_logs`.
7. **Dates always dual-format.** `27 Apr 2026, 10:34 AM · 2 days ago`
8. **Signed URLs only.** Never public file links for resumes or documents.
