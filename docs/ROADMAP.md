# SRP AI Growth — Master Phase-Wise Roadmap

**Project:** SRP AI Growth  
**Live Platform:** https://growth.srpailabs.com/  
**Powered by:** SRP AI Labs  
**Last Updated:** May 2026 (v3.0.0)

---

## System Vision

SRP AI Growth is an end-to-end agentic platform where the **lead generator is the competitive advantage**. Leads are generated via AI (Apollo, Apify, Google Maps), scored against an ICP, converted to clients, job requirements raised, and recruiters assigned — all in one seamless workflow. The platform connects Sales and Recruitment under a single login with strict commercial boundaries.

```
AI Lead Generation
       ↓
  Lead Scoring (ICP)
       ↓
  Company / Contact
       ↓
  Client Conversion
       ↓
  JD Created by Sales
       ↓
  Recruiter Assigned
       ↓
  Candidate Sourced + Screened
       ↓
  Submission → Client
       ↓
  Interview → Offer → Joined
```

---

## Current Phase Status

| Phase | SRP Name | Status |
|-------|----------|--------|
| 00 | **SRP Core Foundation** | ✅ DONE |
| 01 | **SRP Enterprise Core — Interview, Offer & RBAC Engine** | ✅ DONE |
| 02 | **SRP Placement Desk — Full Submission & Interview UI** | ✅ DONE |
| 03 | **SRP JD Desk — Sales-to-Recruiter Handoff Polish** | ✅ DONE |
| 04 | **SRP Candidate 360 — Status Lifecycle & Onboarding** | ✅ DONE |
| 05 | **SRP Talent Search — Boolean & Talent Pool** | ✅ DONE |
| 06 | **SRP Cross-Team Alerts & QA** | ✅ DONE |
| 07 | **SRP My Hub — Team Productivity Layer** | ✅ DONE |
| 08 | **SRP Connect — Global Outreach Channels** | ✅ DONE |
| 09 | **SRP Reports & Analytics — Exports & Custom Dashboards** | ✅ DONE |

---

## Phase 00 — SRP Core Foundation

**Status:** ✅ COMPLETE

### Sales CRM
| Feature | Backend | Frontend | Notes |
|---------|---------|---------|-------|
| Leads list | ✅ | ✅ | Full table: stage, ICP score, last contacted, next follow-up, source, filters |
| Lead 360 page | ✅ | ✅ | Detail view with activities |
| Generate Leads (AI) | ✅ | ✅ | Apollo / Apify / Google Maps / CSV import |
| Companies list | ✅ | ✅ | Organisation master |
| Contacts | ✅ | ✅ | Linked to company |
| Clients list | ✅ | ✅ | Status filters, stats |
| Client 360 (basic) | ✅ | ✅ | Tabs: Overview, JDs, Submissions, Opportunities, Notes, Timeline |
| Opportunities | ✅ | ✅ | List + new form |
| Follow-ups | ✅ | ✅ | List + new form |
| Outreach sequences | ✅ | ✅ | AI-drafted, user-confirmed send |
| Proposals list | ✅ | ✅ | StatusBadge: DRAFT/SENT/UNDER_REVIEW/ACCEPTED/REJECTED/REVISED |
| New proposal form | ✅ | ✅ | `/proposals/new` |

### Recruitment ATS
| Feature | Backend | Frontend | Notes |
|---------|---------|---------|-------|
| Candidates list | ✅ | ✅ | Full table: AI score, stage, visa, skills, bulk screen, star rating |
| Candidate 360 | ✅ | ✅ | Tabs: Overview, Resume, Applications, AI Screening, Notes, Timeline, Submissions |
| Resume upload + text extract | ✅ | ✅ | PDF/DOCX, rawText stored |
| Jobs/JDs list | ✅ | ✅ | Table + Cards view toggle |
| JD 360 | ✅ | ✅ | Overview + Applications tab with inline screening |
| AI Screening (single) | ✅ | ✅ | Score, recommendation, matched/missing skills — cached |
| Bulk AI Screening | ✅ | ✅ | BulkScreenModal on candidates page |
| Applications list | ✅ | ✅ | Table + Kanban board view, stage badges |
| Submissions list | ✅ | ✅ | Stage stats cards, list, new form |
| AI Match / Screen page | ✅ | ✅ | `/ai/screen` |
| LinkedIn sourcing | ✅ | ✅ | `/linkedin` |
| Visa Guide | ✅ | ✅ | `/visa-guide` |

### Platform & Operations
| Feature | Backend | Frontend | Notes |
|---------|---------|---------|-------|
| Dashboard | ✅ | ✅ | Role-based KPI cards, Hiring Funnel chart, Lead Stages chart, AI usage |
| Analytics | ✅ | ✅ | Full Recharts: AreaChart, BarChart, LineChart, PieChart |
| Documents | ✅ | ✅ | Upload, signed URLs, type filter |
| Imports | ✅ | ✅ | CSV/API bulk import |
| Workflows | ✅ | ✅ | n8n WorkflowRun list with pause/resume/retry/override |
| Integrations | ✅ | ✅ | Integration config panel |
| Settings | ✅ | ✅ | Tenant settings |

### Admin (TENANT_ADMIN + SUPER_ADMIN only)
| Feature | Backend | Frontend | Notes |
|---------|---------|---------|-------|
| Billing | ✅ | ✅ | Usage meters (% bars), plan management (FREE→ENTERPRISE), payment modal |
| Users & Roles | ✅ | ✅ | Invite users, change roles, seat count from subscription plan |
| Audit Logs | ✅ | ✅ | Action filter, entity type filter, detail drawer (old/new values) |

### Owner (SUPER_ADMIN only)
| Feature | Status |
|---------|--------|
| Owner Control Panel | ✅ `/owner` — 5 tabs: Overview, Tenants, Subscriptions, Signups, AI Usage |

### Infrastructure
| Feature | Status |
|---------|--------|
| Prisma DB schema (31 models, 13 enums) | ✅ |
| Multi-tenant architecture | ✅ |
| JWT auth + refresh tokens | ✅ |
| BullMQ queues (enrichment, outreach, dedupe) | ✅ |
| n8n workflows (candidate + lead import, AI screening, outreach) | ✅ |
| Document storage (MinIO/S3) | ✅ |
| Nginx reverse proxy (growth.srpailabs.com, Cloudflare TLS) | ✅ |
| Production Docker Compose (:8020/:8021) | ✅ |

---

## Phase 01 — SRP Enterprise Core

**Status:** ✅ COMPLETE  
**Goal:** Build the enterprise hiring workflow engine — Interviews, Offers, commercial access control, role-aware data views, and submission lifecycle events.

### 1.1 — Interview Module (Backend)

| Task | Status | Notes |
|------|--------|-------|
| `Interview` Prisma model | ✅ | mode, status, round, scheduledAt, completedAt, meetingLink, feedback, rating 1-5, result, notes |
| Migration `20260420000001` | ✅ | DDL: `interviews` table with FK constraints + indexes |
| `POST /api/v1/interviews` | ✅ | Create interview linked to submission |
| `GET /api/v1/interviews` | ✅ | Filter by submissionId, candidateId, jobId, status |
| `GET /api/v1/interviews/stats` | ✅ | Aggregate: total, by status, by mode |
| `GET /api/v1/interviews/:id` | ✅ | Full relations: submission, candidate, job |
| `PUT /api/v1/interviews/:id` | ✅ | Update round, mode, status, feedback, rating 1-5, result |
| `DELETE /api/v1/interviews/:id` | ✅ | TENANT_ADMIN / SUPER_ADMIN only |

### 1.2 — Offer Module (Backend)

| Task | Status | Notes |
|------|--------|-------|
| `Offer` Prisma model | ✅ | offeredSalary, currency, joiningDate, expiryDate, offerLetterUrl, status, declineReason |
| Migration `20260420000001` | ✅ | DDL: `offers` table |
| `POST /api/v1/offers` | ✅ | Sales-only; active offer conflict guard |
| `GET /api/v1/offers` | ✅ | Tenant-scoped list |
| `GET /api/v1/offers/stats` | ✅ | Aggregate by status |
| `GET /api/v1/offers/:id` | ✅ | Full relations |
| `PUT /api/v1/offers/:id` | ✅ | Status lifecycle: PENDING → EXTENDED → ACCEPTED / DECLINED / WITHDRAWN / EXPIRED |
| `DELETE /api/v1/offers/:id` | ✅ | TENANT_ADMIN / SUPER_ADMIN only |

### 1.3 — Commercial Firewall

| Task | Status | Notes |
|------|--------|-------|
| `stripCommercial<T>()` utility in jobs.service.ts | ✅ | Removes `billingRate` + `candidatePayRate` |
| `JobsService.findAll()` — role-aware | ✅ | Auto-strips commercial fields for RECRUITER role |
| `JobsService.findOne()` — role-aware | ✅ | Auto-strips commercial fields for RECRUITER role |
| Recruiter JD scoping | ✅ | `assignedRecruiterId` auto-filter when role === RECRUITER |

### 1.4 — Submissions Enhancement

| Task | Status | Notes |
|------|--------|-------|
| `create()` with `createdById` | ✅ | Logs activity + emits `submission.created` event |
| `updateClientFeedback()` method | ✅ | Updates feedback + stage, logs activity, emits `submission.feedback` |
| `PUT /submissions/:id/client-feedback` | ✅ | Sales / TENANT_ADMIN / SUPER_ADMIN only |
| SubmissionsModule imports PrismaModule + BillingModule | ✅ | |

### 1.5 — Analytics Expansion

| KPI | Status | Notes |
|-----|--------|-------|
| `submissionsTotal` | ✅ | Total submissions for tenant |
| `submissionsThisWeek` | ✅ | Submissions created in last 7 days |
| `activeClients` | ✅ | Clients with >= 1 open JD |
| `placementsThisMonth` | ✅ | Offers accepted in current calendar month |

### 1.6 — Frontend

| Task | Status | Notes |
|------|--------|-------|
| `interviewsApi` in api-client.ts | ✅ | list, get, create, update, remove, stats |
| `offersApi` in api-client.ts | ✅ | list, get, create, update, remove, stats |
| `submissionsApi.clientFeedback` | ✅ | PUT /submissions/:id/client-feedback |
| Candidate 360 — Submissions tab | ✅ | Stage badge, client/job info, feedback quote, interview date |
| Dashboard — Role-based KPI grid | ✅ | RECRUITER / SALES / Admin variants |

---

## Phase 02 — SRP Placement Desk: Full Submission & Interview UI

**Status:** ✅ COMPLETE  
**Goal:** Complete the visual placement desk. Give every role a full UI for the submission → interview → offer lifecycle.

### 2.1 — Interviews Full Page (`/interviews`)

| Task | Status | Notes |
|------|--------|-------|
| `/interviews` list page | ✅ | Table: candidate, job, client, round, mode, scheduledAt, status, result |
| Status badge (color-coded) | ✅ | SCHEDULED=blue, COMPLETED=green, CANCELLED=red, NO_SHOW=orange |
| Schedule interview modal | ✅ | From submission dropdown: date, time, mode, meeting link, round |
| Edit / reschedule modal | ✅ | Update status/result/rating/feedback via FeedbackModal |
| Feedback entry form | ✅ | Post-interview: rating (1-5 stars), result (PASS/FAIL/HOLD), notes |
| Filter: by status / by date / by recruiter | ✅ | Status filter tabs + stats cards |

### 2.2 — Offers Full Page (`/offers`)

| Task | Status | Notes |
|------|--------|-------|
| `/offers` list page | ✅ | Table: candidate, job, client, offeredSalary, currency, status, joiningDate, expiry |
| Status action buttons on row | ✅ | PENDING→EXTENDED→ACCEPTED/DECLINED/WITHDRAWN via TRANSITIONS map |
| Offer letter upload | ⏳ | Deferred — MinIO upload planned for Phase 03 |
| Decline reason capture modal | ✅ | Free text reason captured via DeclineModal |
| Filter: by status / by client | ✅ | Status stat cards + filter bar |

### 2.3 — JD 360 — Submissions Tab

| Task | Status | Notes |
|------|--------|-------|
| New "Submissions" tab on JD 360 page | ✅ | Pipeline / Submissions tab bar on JD 360 |
| Submission row: candidate name, stage badge, submitted date | ✅ | SUB_STAGE_COLORS, linked to candidate 360 |
| Client feedback column | ✅ | Shows feedback quote or "Pending" italic |
| Interview status column | ⏳ | Deferred — requires interview join on submissions query |
| "Enter Feedback" inline action | ✅ | ClientFeedbackModal → PUT /submissions/:id/client-feedback |

### 2.4 — Client 360 — Missing Tabs

| Tab | What to show | Status |
|-----|-------------|--------|
| Contacts | All contacts linked to this client | ✅ | Primary contact + billing contact panel |
| Commercials | Billing rate, payment terms — Sales/Admin only | ⏳ | Deferred — paymentTerms shown in Overview tab for now |
| Documents | Proposals, contracts, agreements uploaded against client | ✅ | Documents tab via documentsApi.list({ clientId }) |
| KPI Cards | Total JDs / CVs Submitted / Opportunities / Interviews / Offers / Follow Ups | ✅ | 6-card row with live counts |

### 2.5 — Submissions Pipeline: Kanban Board View

| Task | Status | Notes |
|------|--------|-------|
| Kanban board on `/submissions` | ✅ | 10 columns: all STAGE_CONFIG stages, horizontally scrollable |
| Drag-and-drop stage update | ✅ | Inline `<select>` on each card → PUT /submissions/:id |
| Card: candidate name, job title, client | ✅ | + AI match score bar, submitted date, external link |
| Quick actions on card | ✅ | Stage change select + View link; full D&D deferred |

---

## Phase 03 — SRP JD Desk: Sales-to-Recruiter Handoff Polish

**Status:** ✅ COMPLETE  
**Goal:** Make the JD page the clean handoff point. Sales assigns recruiters; Recruiters see filtered JDs; both track submission status from the JD.

### 3.1 — Recruiter Assignment from JD Page

| Task | Status | Notes |
|------|--------|-------|
| "Assign Recruiter" button on JD 360 Overview tab | ✅ | Sales / TENANT_ADMIN / SUPER_ADMIN only |
| Modal: searchable user dropdown (RECRUITER role) | ✅ | Fetches from GET /team/recruiters |
| `PUT /jobs/:id` sets `assignedRecruiterId` | ✅ | Field already in schema; via existing endpoint |
| Display assigned recruiter on JD 360 header | ✅ | Name + Change / Unassign action |
| `GET /team/recruiters` backend endpoint | ✅ | Returns active RECRUITERs, any auth user |

### 3.2 — Lead → Client Conversion Flow

| Task | Status | Notes |
|------|--------|-------|
| "Convert to Client" button on Lead 360 | ✅ | Hidden if already converted |
| Pre-fill Client form from Lead/Company data | ✅ | Backend auto-fills from lead relation |
| Set `lead.convertedToClientId` + `lead.convertedAt` | ✅ | Done server-side in clientsService |
| Set `company.isClient = true`, `company.clientId` | ✅ | Done in transaction |
| Redirect to new Client 360 after conversion | ✅ | Router.push to /clients/{id} |
| "View Client" link if already converted | ✅ | Links to existing client |

### 3.3 — Lead 360: ICP Score Explanation Panel

| Task | Status | Notes |
|------|--------|-------|
| Score breakdown panel (Company Fit, Title Fit, Industry, Country, Engagement) | ✅ | Renders all keys in scoreBreakdown JSON dynamically |
| Recommended action text based on score bucket | ✅ | scoreNextAction from AI response |

### 3.4 — Proposal 360 (Detail View)

| Task | Status | Notes |
|------|--------|-------|
| `/proposals/:id` detail page | ✅ | Full proposal 360 built |
| Status progression UI | ✅ | Visual step bar: DRAFT → SENT → UNDER_REVIEW → ACCEPTED |
| Link to client (backlink to Client 360) | ✅ | Link component |
| Link to lead (backlink to Lead 360) | ✅ | |
| Document URL link | ✅ | Opens proposal file in new tab |

---

## Phase 04 — SRP Candidate 360: Status Lifecycle & Onboarding

**Status:** ✅ COMPLETE  
**Goal:** Complete the candidate journey from sourced to joined. 19-status lifecycle engine + post-offer onboarding checklist.

### 4.1 — 19-Status Lifecycle Engine

| Status | Meaning |
|--------|---------|
| SOURCED | First entered the system |
| CONTACTED | Initial outreach sent |
| INTERESTED | Responded positively |
| NOT_INTERESTED | Declined |
| PROFILE_RECEIVED | CV/profile in hand |
| SCREENING | Under AI/manual review |
| SHORTLISTED | Passed screening |
| SUBMITTED | CV sent to client |
| CLIENT_REVIEW | Awaiting client feedback |
| INTERVIEW_SCHEDULED | Interview booked |
| INTERVIEW_COMPLETED | Interview done |
| OFFER_PENDING | Offer being prepared |
| OFFERED | Offer extended |
| OFFER_ACCEPTED | Candidate accepted |
| OFFER_DECLINED | Candidate declined offer |
| JOINED | Candidate started |
| ON_HOLD | Paused |
| REJECTED | Did not pass |
| WITHDRAWN | Candidate dropped out |

| Task | Status |
|------|--------|
| Status machine with valid transitions (server-side) | ✅ |
| `CandidateStatusHistory` log table | ✅ |
| Status timeline on Candidate 360 | ✅ |

### 4.2 — Onboarding Checklist (Post-Offer)

| Task | Status | Notes |
|------|--------|-------|
| Onboarding checklist tab on Candidate 360 | ✅ | After OFFER_ACCEPTED |
| Document items: Passport, Visa, Offer Letter, Contract, Bank Details | ✅ | |
| Document verification status: Uploaded / Verified / Missing | ✅ | |
| Joining date: Expected vs Actual | ✅ | |
| Onboarding completion % bar | ✅ | |

---

## Phase 05 — SRP Talent Search: Boolean & Talent Pool

**Status:** ✅ COMPLETE

| Task | Status |
|------|--------|
| Boolean search UI (AND/OR/NOT, field selectors) | ✅ |
| Saved searches | ✅ |
| Talent Pools list | ✅ |
| Add candidate to pool from candidate card | ✅ |
| Pool to batch submission workflow | ✅ |
| Sourcing pipeline analytics | ✅ |

---

## Phase 06 — SRP Cross-Team Alerts & QA

**Status:** ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Notification center UI (bell icon + unread count) | ✅ | |
| Recruiter notified: JD assigned | ✅ | EventEmitter → notification record |
| Sales notified: submission received | ✅ | `submission.created` event |
| Sales notified: interview scheduled | ✅ | |
| Client feedback reminder (no feedback after 3 days) | ✅ | Cron job |
| QA gate: submission without CV blocked | ✅ | Validation in submissions.service |

---

## Phase 07 — SRP My Hub: Team Productivity Layer

**Status:** ✅ DONE  
See [phases/PHASE-07-My-Hub.md](phases/PHASE-07-My-Hub.md)

| Feature | Status |
|---------|--------|
| My Dashboard (role-aware KPI cards) | ✅ |
| My JDs page (recruiter) | ✅ |
| My Submissions page (recruiter) | ✅ |
| My Leads page (sales) | ✅ |
| My Follow-ups page (5 views: today/overdue/week/completed/all) | ✅ |
| My Activity feed (audit log timeline) | ✅ |
| Profile view & edit | ✅ |
| Sidebar: My Hub group (role-filtered) | ✅ |

---

## Phase 08 — SRP Connect: Global Outreach Channels

**Status:** ✅ DONE  
See [phases/PHASE-08-Connect.md](phases/PHASE-08-Connect.md)

| Integration | Status |
|-------------|--------|
| Gmail OAuth (per-user, nodemailer OAuth2 transport) | ✅ |
| Outlook / Microsoft 365 (per-user, Graph API) | ✅ |
| WhatsApp Business API (Meta Cloud API, HMAC webhook) | ✅ |
| Telegram Bot API (send + team alerts) | ✅ |
| Microsoft Teams (Incoming Webhooks) | ✅ |
| Smart email routing (Gmail → Outlook → error) | ✅ |
| ConnectModule backend (service + controller + module) | ✅ |
| IntegrationProvider enum extended (5 new types) | ✅ |
| My Hub → Profile page: Connect Gmail / Outlook | ✅ |
| Integrations page: Communication Channels section | ✅ |
| Sidebar: My Profile link added to My Hub group | ✅ |

---

## Phase 09 — SRP Reports & Analytics: Exports & Custom Dashboards

**Status:** 🔶 IN PROGRESS  
See [phases/PHASE-09-Reports-Analytics.md](phases/PHASE-09-Reports-Analytics.md)

| Feature | Status |
|---------|--------|
| `ReportsModule` backend (service + controller + module) | ✅ |
| `GET /reports/placement-velocity` — time-to-submit + time-to-offer per placement | ✅ |
| `GET /reports/sales-pipeline` — leads, conversions, pipeline value per sales rep | ✅ |
| `GET /reports/recruiter-performance` — submissions, interviews, offers, placement rate | ✅ |
| `GET /reports/client-activity` — open JDs, submissions, interviews, placements per client | ✅ |
| `GET /reports/ai-usage` — AI screens + AI lead gen per user | ✅ |
| CSV export (`?format=csv`) on all report endpoints | ✅ |
| Excel export (`?format=xlsx`) on all report endpoints (using `xlsx` package) | ✅ |
| Dashboard widget layout — `GET/PUT /reports/dashboard/widgets` (stored in `user.settings`) | ✅ |
| `reportsApi` in api-client.ts (8 methods incl. exportUrl helper) | ✅ |
| `/reports` hub page — 5 report cards with role labels | ✅ |
| `/reports/placement-velocity` — date filter, stats cards, colour-coded table, CSV+Excel export | ✅ |
| `/reports/sales-pipeline` — bar chart + table, pipeline value, conversion %, overdue badges | ✅ |
| `/reports/recruiter-performance` — leaderboard table with trophy badge, placement rate badges | ✅ |
| `/reports/client-activity` — client table with placement highlights | ✅ |
| `/reports/ai-usage` — AI screens + leads generated per user | ✅ |
| Sidebar: "Reports" link added to Analytics & Reports group | ✅ |
