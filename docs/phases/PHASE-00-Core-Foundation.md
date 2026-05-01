# Phase 00 — SRP Core Foundation

**Status:** ✅ DONE  
**Goal:** Establish the complete Sales CRM + Recruitment ATS base platform with Auth, Dashboard, and all primary entities.

---

## Sales CRM

| Feature | Backend | Frontend | Notes |
|---------|---------|----------|-------|
| Leads list | ✅ | ✅ | Stage, ICP score, last contacted, next follow-up, source, filters |
| Lead 360 page | ✅ | ✅ | Detail view + activities |
| Generate Leads (AI) | ✅ | ✅ | Apollo / Apify / Google Maps / CSV import |
| Companies list | ✅ | ✅ | Organisation master |
| Contacts | ✅ | ✅ | Linked to company |
| Clients list | ✅ | ✅ | Status filters, stats |
| Client 360 | ✅ | ✅ | Tabs: Overview, JDs, Submissions, Opportunities, Notes, Timeline |
| Opportunities | ✅ | ✅ | List + new form |
| Follow-ups | ✅ | ✅ | List + new form |
| Outreach sequences | ✅ | ✅ | AI-drafted, user-confirmed send |
| Proposals list | ✅ | ✅ | DRAFT/SENT/UNDER_REVIEW/ACCEPTED/REJECTED/REVISED |
| New proposal form | ✅ | ✅ | `/proposals/new` |

## Recruitment ATS

| Feature | Backend | Frontend | Notes |
|---------|---------|----------|-------|
| Candidates list | ✅ | ✅ | AI score, stage, visa, skills, bulk screen, star rating |
| Candidate 360 | ✅ | ✅ | Tabs: Overview, Resume, Applications, AI Screening, Notes, Timeline, Submissions |
| Resume upload + text extract | ✅ | ✅ | PDF/DOCX, rawText stored |
| Jobs/JDs list | ✅ | ✅ | Table + Cards view toggle |
| JD 360 | ✅ | ✅ | Overview + Applications tab + Submissions tab |
| AI Screening (single) | ✅ | ✅ | Score, recommendation, matched/missing skills — cached |
| Bulk AI Screening | ✅ | ✅ | BulkScreenModal on candidates page |
| Applications list | ✅ | ✅ | Table + Kanban board view, stage badges |
| Submissions list | ✅ | ✅ | Stage stats cards, new form |
| AI Match / Screen page | ✅ | ✅ | `/ai/screen` |
| LinkedIn sourcing | ✅ | ✅ | `/linkedin` |
| Visa Guide | ✅ | ✅ | `/visa-guide` |

## Platform & Operations

| Feature | Backend | Frontend | Notes |
|---------|---------|----------|-------|
| Dashboard | ✅ | ✅ | Role-based KPI cards, Hiring Funnel chart, Lead Stages chart, AI usage |
| Analytics | ✅ | ✅ | Full Recharts: AreaChart, BarChart, LineChart, PieChart |
| Documents | ✅ | ✅ | Upload, signed URLs, type filter |
| Imports | ✅ | ✅ | CSV/API bulk import |
| Workflows | ✅ | ✅ | n8n WorkflowRun list with pause/resume/retry/override |
| Integrations | ✅ | ✅ | Integration config panel |
| Settings | ✅ | ✅ | Tenant settings |

## Admin (TENANT_ADMIN + SUPER_ADMIN)

| Feature | Backend | Frontend |
|---------|---------|----------|
| Billing — usage meters + plan management | ✅ | ✅ |
| Users & Roles — invite, role change, seat count | ✅ | ✅ |
| Audit Logs — action/entity filters, detail drawer | ✅ | ✅ |

## Owner (SUPER_ADMIN)

| Feature | Status |
|---------|--------|
| Owner Control Panel — 5 tabs: Overview, Tenants, Subscriptions, Signups, AI Usage | ✅ |

## Infrastructure

| Item | Status |
|------|--------|
| Prisma DB schema (31 models, 13 enums) | ✅ |
| Multi-tenant architecture | ✅ |
| JWT auth + refresh tokens | ✅ |
| BullMQ queues (enrichment, outreach, dedupe) | ✅ |
| n8n workflows (candidate + lead import, AI screening, outreach) | ✅ |
| Document storage (MinIO/S3) | ✅ |
| Nginx reverse proxy (growth.srpailabs.com, Cloudflare TLS) | ✅ |
| Production Docker Compose (:8020/:8021) | ✅ |
