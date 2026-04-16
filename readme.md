<div align="center">

# 🚀 Recruitment + Sales Agentic Automation Platform

**Production-ready multi-tenant automation platform for SRP AI Labs**

[![Status](https://img.shields.io/badge/status-live-brightgreen?style=for-the-badge)]()
[![Multi-Tenant](https://img.shields.io/badge/multi--tenant-yes-blue?style=for-the-badge)]()
[![AI Powered](https://img.shields.io/badge/AI-powered-purple?style=for-the-badge)]()
[![n8n](https://img.shields.io/badge/orchestration-n8n-orange?style=for-the-badge)]()
[![Countries](https://img.shields.io/badge/countries-7%2B-green?style=for-the-badge)]()

> A scalable, modular system that unifies **recruitment automation**, **sales pipeline**, and **AI-driven workflows** across multiple countries, industries, and tenants — built for reliability, not just speed.

</div>

---

## 🌐 Live Deployment

| | |
|---|---|
| **URL** | [https://growth.srpailabs.com](https://growth.srpailabs.com) |
| **Backend API** | `https://growth.srpailabs.com/api/v1/` |
| **Server** | Hetzner Cloud (Docker Compose) |
| **SSL** | Cloudflare Origin Certificate (auto-managed) |
| **Demo Login** | See server `.env` or contact platform admin |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, React Query |
| Backend | NestJS 10, Prisma 5, BullMQ |
| Database | PostgreSQL |
| Cache | Redis |
| Object Storage | MinIO (S3-compatible) |
| AI | OpenRouter (GPT-4o, Claude) |
| Orchestration | n8n |
| Deployment | Docker Compose, Nginx, Certbot |

### Key Features (Live)

- **Dashboard** — KPIs, recruitment funnel, sales pipeline, AI usage charts
- **Candidates** — Import, search, AI screening, application tracking, outreach
- **Jobs** — Post jobs, view applications, change stages, AI screen candidates
- **Leads** — Sales pipeline with AI ICP scoring, stage management
- **Companies & Contacts** — CRM for client organizations
- **Document Vault** — Secure S3 document storage with AES-256 encryption, signed URL downloads, duplicate detection, and full audit trail
- **Outreach** — AI-generated personalized emails with approval workflow
- **AI Screen** — Resume parser, JD parser (PDF/DOCX upload), AI screening
- **Visa Guide** — 16 visa types across 7 countries with 2025-2026 data + immigration links
- **Imports** — CSV / Excel / manual data import with field mapping
- **Analytics** — Recruitment funnel, sales metrics, AI usage tracking
- **Billing** — Subscription plans with usage limits
- **Google OAuth** — SSO with account linking and invite-based onboarding
- **Team Management** — Invite users, assign roles, manage team from dashboard
- **Onboarding Wizard** — Guided 5-step tenant setup flow

### Security Features

| Feature | Details |
|---------|--------|
| Encryption at rest | AES-256 server-side encryption for all documents in S3 storage |
| Encryption in transit | TLS 1.3 with HSTS preload headers |
| Tenant isolation | Database-level + API-level tenant scoping on every query |
| Authentication | JWT + refresh token rotation, Google OAuth2 SSO |
| Authorization | Role-based access control (RBAC) with 5 roles |
| File validation | Strict MIME type allowlist + size limits + SHA-256 checksum |
| Duplicate detection | Checksum-based duplicate file detection per tenant |
| Signed URLs | Time-limited (15 min) pre-signed download URLs for documents |
| Audit logging | Every mutation tracked with actor, timestamp, IP, and user-agent |
| Security headers | Helmet.js + CSP + X-Frame-Options DENY + nosniff + strict referrer |
| Rate limiting | 1000 req/min global throttle via NestJS Throttler |
| Input validation | Whitelist-only DTO validation with class-validator |
| Error sanitization | Global exception filter prevents raw DB error leakage |

---

## 📋 Table of Contents

- [🎯 Main Objective](#-main-objective)
- [⚠️ Critical Architecture Rule](#️-critical-architecture-rule)
- [🏗️ System Architecture](#️-system-architecture)
- [🧩 Core Modules](#-core-modules)
  - [1. Multi-Tenant Foundation](#1-multi-tenant-foundation)
  - [2. Country-Aware Configuration Engine](#2-country-aware-configuration-engine)
  - [3. Canonical Data Model](#3-canonical-data-model)
  - [4. Source Ingestion Engine](#4-source-ingestion-engine)
  - [5. Mapping & Normalization UI](#5-mapping--normalization-ui)
  - [6. Recruitment Automation Module](#6-recruitment-automation-module)
  - [7. Sales Automation Module](#7-sales-automation-module)
  - [8. AI Services Layer](#8-ai-services-layer)
  - [9. n8n Integration Layer](#9-n8n-integration-layer)
  - [10. Error-Proof Integration Design](#10-error-proof-integration-design)
  - [11. Outreach & Approval Model](#11-outreach--approval-model)
  - [12. Multi-Country Support](#12-multi-country-support)
  - [13. Visa & Immigration Rules Engine](#13-visa--immigration-rules-engine)
  - [14. Role-Aware AI Resume Screening](#14-role-aware-ai-resume-screening)
- [🖥️ UI Pages](#️-ui-pages)
- [📊 Analytics](#-analytics)
- [🔧 Backend & API Expectations](#-backend--api-expectations)
- [🛡️ Reliability Rules](#️-reliability-rules)
- [📚 Documentation Tasks](#-documentation-tasks)
- [📦 Delivery Format](#-delivery-format)
- [🌍 Product Direction](#-product-direction)

---

## 🎯 Main Objective

This platform serves three core user types:

| User | Goal |
|------|------|
| 👔 **Recruiters** | Find, import, screen, rank, and manage candidates from multiple sources |
| 💼 **Sales Teams** | Find, enrich, qualify, and convert leads into paying clients |
| ⚙️ **Admins** | Operate automated workflows across multiple industries and countries |

---

## ⚠️ Critical Architecture Rule

> **Do NOT put business logic directly into n8n.**

| Layer | Responsibility |
|-------|---------------|
| 🔄 **n8n** | Workflow orchestration and automation engine **only** |
| ⚙️ **Backend API** | Core business logic, schema validation, tenant rules, scoring, audit history |
| 🗄️ **Database** | Single canonical source of truth for all entities |

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND DASHBOARDS                           │
│         Admin Dashboard  │  Recruiter Dashboard  │  Sales Dashboard  │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ REST / WebSocket
┌───────────────────────────────▼──────────────────────────────────────┐
│                       BACKEND API  (Core)                            │
│    Business Logic  │  Validation  │  Tenant Rules  │  Audit History  │
└────────┬───────────────────────┬──────────────────────┬──────────────┘
         │                       │                      │
  ┌──────▼──────┐        ┌───────▼───────┐      ┌──────▼──────┐
  │  Database   │        │   n8n Engine  │      │ AI Services │
  │  (Schemas)  │        │  (Automation) │      │  (Parsing / │
  │             │        │               │      │   Scoring)  │
  └─────────────┘        └───────┬───────┘      └─────────────┘
                                 │
                        ┌────────▼────────┐
                        │  Queue / Jobs   │
                        │ (Async + Retry) │
                        └─────────────────┘
```

| Component | Role |
|-----------|------|
| **Frontend** | Admin, Recruiter, and Sales dashboards |
| **Backend API** | Central source of truth for all entities and workflow states |
| **Database** | Canonical schemas: candidates, jobs, leads, companies, contacts, activities, outreach, workflow runs |
| **n8n** | Automation: scheduled jobs, imports, enrichment, notifications, sync, follow-ups, webhooks |
| **AI Services** | Parsing, scoring, summarization, personalization, ranking |
| **Queue / Jobs** | All heavy processing runs asynchronously with retry support |
| **Observability** | Logs, execution history, error tracking, dead-letter queue, workflow run status |

---

## 🧩 Core Modules

### 1. Multi-Tenant Foundation

| Feature | Details |
|---------|---------|
| Tenant management | Isolated per-tenant data and settings |
| Role-based access control | Admin, Recruiter, Sales, Viewer roles |
| Audit logs | Every mutation tracked with actor + timestamp |
| Per-tenant settings | Custom branding, limits, configs |
| Country & language preferences | Per-tenant locale defaults |
| Timezone & currency support | Full internationalization |

---

### 2. Country-Aware Configuration Engine

> Supports multiple countries without hardcoded market assumptions. Easy to add new countries without code duplication.

Each country config contains:

| Config Key | Example |
|------------|---------|
| `timezone` | `Asia/Kuala_Lumpur` |
| `currency` | `MYR` |
| `language` | `en-MY` |
| `phone_format` | `+60-XX-XXXXXXX` |
| `date_format` | `DD/MM/YYYY` |
| `job_board_sources` | JobStreet, LinkedIn, etc. |
| `outreach_templates` | Localized message templates |
| `compliance_notes` | PDPA, GDPR, etc. |

---

### 3. Canonical Data Model

> **All external data must be transformed into canonical schema before entering any workflow.**

| Entity | Description |
|--------|-------------|
| `Candidate` | Core profile: name, contact, skills, experience |
| `Resume` | Parsed document attached to candidate |
| `Job` | Open position with JD, requirements, status |
| `Application` | Candidate ↔ Job link with pipeline stage |
| `Lead` | Sales prospect with scoring and status |
| `Company` | Organization data for leads/clients |
| `Contact` | Decision-maker linked to a company |
| `Outreach Sequence` | Multi-step messaging plan |
| `Activity` | Timeline event (call, email, note, status change) |
| `Workflow Run` | n8n execution record with status + audit trail |
| `Source Import` | Raw + mapped import batch |
| `Mapping Template` | Reusable field mapping config |
| `AI Analysis Result` | Score, explanation, structured output from AI |
| `Scorecard` | Candidate or lead scoring with breakdown |
| `Document` | Uploaded file (resume, proposal, contract) with S3 storage, checksum, and entity linking |

---

### 3.1. Document Storage Module

> Secure, tenant-isolated document management with S3-compatible object storage.

| Feature | Details |
|---------|---------|
| Storage backend | MinIO (S3-compatible), supports AWS S3 / Cloudflare R2 |
| Encryption | AES-256 server-side encryption on all objects |
| Document types | RESUME, LEAD_DOC, PROPOSAL, CONTRACT, COMPANY_DOC, OTHER |
| Entity linking | Documents can be linked to Candidate, Lead, Company, Contact, or Job |
| Duplicate detection | SHA-256 checksum dedup per tenant |
| Access control | Tenant-scoped queries, signed URL downloads (15 min expiry) |
| File validation | MIME type allowlist + configurable size limits (default 25 MB) |
| Business IDs | `DOC-YYYYMM-000001` format |
| Re-parsing | Extract text from PDF/DOCX for updated AI pipelines |
| Audit | Upload, download, and deletion logged via audit system |

**API Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/documents/upload` | Upload document (multipart/form-data) |
| `GET` | `/api/v1/documents` | List documents with filters (type, entity, search) |
| `GET` | `/api/v1/documents/:id` | Get document details with linked entities |
| `GET` | `/api/v1/documents/:id/download-url` | Get signed download URL |
| `GET` | `/api/v1/documents/:id/download` | Backend proxy download |
| `PATCH` | `/api/v1/documents/:id/link` | Link document to entity |
| `POST` | `/api/v1/documents/:id/reparse` | Re-parse document text |
| `DELETE` | `/api/v1/documents/:id` | Delete document |

---

### 4. Source Ingestion Engine

**Supported import sources:**

| Source | Method |
|--------|--------|
| CSV / Excel | File upload |
| Manual entry | Form UI |
| Job board exports | File / API |
| Webhook payloads | `POST /webhooks/import` |
| Apify JSON output | JSON ingestion endpoint |
| Website scraping results | Normalized JSON |
| Email parsing inputs | Parsed email body |

**Per-import pipeline:**

```
Raw Payload → Normalize to Canonical Schema → Validate Required Fields
    → Detect Duplicates → Generate Import Report → Queue for Retry (if failed)
```

---

### 5. Mapping & Normalization UI

A visual field-mapping interface for data migration and integration:

- 📤 Upload raw data file
- 🔗 Drag-and-drop column → field mapping
- 💾 Save and reuse mapping templates
- 👁️ Preview transformed rows before import
- ✅ Validate required fields with error highlighting
- 🔁 Correct and re-import failed rows individually

---

### 6. Recruitment Automation Module

| Feature | Description |
|---------|-------------|
| JD Parser | Extract skills, requirements, and role details from job descriptions |
| Boolean Search Builder | Visual builder for talent search queries |
| Resume Parser | Structured extraction of work history, skills, education |
| Candidate-Job Match Scoring | AI-powered fit score with explanation |
| Shortlist Recommendation | Ranked candidate suggestions per job |
| Interview Recommendation | Trigger interview stage based on score thresholds |
| Pipeline Stages | Sourced → Screened → Interviewing → Offered → Placed / Rejected / Withdrawn |
| Follow-up Reminders | Auto-reminders at each pipeline stage |
| Outreach Draft Generation | Personalized AI-written candidate messages |
| Duplicate Detection | Cross-source deduplication by email, phone, name similarity |

---

### 7. Sales Automation Module

| Feature | Description |
|---------|-------------|
| ICP Builder | Define Ideal Customer Profile per campaign |
| Lead Import | Bulk import from CSV, LinkedIn, scrapers, etc. |
| Signal-Based Lead Scoring | Score leads based on website signals, job posts, social activity |
| Pain Point Extraction | AI-analysis of company website, job posts, and source notes |
| Decision-Maker Enrichment | Find and enrich key contacts at target companies |
| Outreach Draft Generation | Personalized AI-written sales messages |
| Follow-up Sequence Generator | Multi-touch sequences tailored to lead tier |
| Pipeline Stages | New → Contacted → Qualified → Proposal → Negotiation → Closed Won / Closed Lost |
| Activity Timeline | Full history: calls, emails, notes, stage changes |
| Next-Best Action | AI-suggested next step per lead |

---

### 8. AI Services Layer

**Reusable AI services (provider-agnostic):**

| Service | Output |
|---------|--------|
| Resume Parser | Structured candidate object |
| JD Parser | Structured job requirements |
| Lead Research Summarizer | Company summary + pain points |
| Candidate Scoring | Score + explanation |
| Lead Scoring | Score + rationale |
| Outreach Generator | Personalized email/message draft |
| Follow-up Generator | Sequence of follow-up messages |
| Pain Point Extractor | Company challenges from public data |
| Multilingual Output | Localized content generation |

**Requirements:**

```
✅ Prompt templates versioned in database
✅ Provider abstraction (OpenAI / OpenRouter / custom)
✅ Usage tracking per tenant
✅ Retry and fallback handling
✅ Response validation with schema enforcement
✅ Structured JSON outputs
```

---

### 9. n8n Integration Layer

> n8n is the **orchestration engine only** — never the business logic layer.

**Workflow types:**

| Workflow | Trigger |
|----------|---------|
| New Candidate Imported | `POST /webhooks/candidate-imported` |
| New Lead Imported | `POST /webhooks/lead-imported` |
| Scheduled Enrichment | Cron — nightly |
| Follow-up Reminder Creation | Schedule per pipeline stage |
| Outreach Draft Generation | Event: new lead/candidate |
| Webhook Sync from External Tools | External `POST` webhooks |
| Nightly Dedupe Job | Cron |
| Failed Import Retry | Dead-letter queue trigger |
| Broken Integration Alert | Health check monitor |

**Integration contract:**

```
n8n → POST /api/internal/... (backend endpoint)
         ↓
  Backend validates + enforces tenant boundary
         ↓
  Stores workflow run history
         ↓
  Returns { status, workflowRunId, data }
```

---

### 10. Error-Proof Integration Design

> Solving the root causes of: connection pain, mapping failures, and workflow breakage.

| Feature | Purpose |
|---------|---------|
| Integration Registry | Central list of all connected services |
| Credential Health Checker | Periodic validation of API keys and tokens |
| Test Connection Button | Manual on-demand connectivity test |
| Schema Validation Before Execution | Block bad data before it enters workflows |
| Execution Logs | Per-node logs for every workflow run |
| Node-Level Error Capture | Isolate and surface exact failure points |
| Retry Policy | Configurable retries with exponential backoff |
| Fallback Queue | Route failed jobs to dead-letter processing |
| Admin Alerts | Real-time notifications for integration failures |
| Integration Status Dashboard | Live status board for all active integrations |

---

### 11. Outreach & Approval Model

> 🚫 No mass spam automation. ✅ Human-approved, AI-assisted outreach only.

| Feature | Description |
|---------|-------------|
| AI-Generated Drafts | Personalized message drafts for each contact |
| Sequence Generator | Multi-step outreach plans (Day 1, Day 3, Day 7...) |
| Manual Approval Gate | Every message requires human approval before send |
| Send Logging | Full record of what was sent, when, by whom |
| Reply Tracking Hooks | Detect replies and update contact status |
| Suppression List | Opt-outs and do-not-contact records |
| Contact Frequency Limits | Max messages per contact per time period |
| Per-Tenant Messaging Policy | Customizable rules per client or team |

---

### 12. Multi-Country Support

**Starter Country Packs:**

| Country | Timezone | Currency | Locale |
|---------|----------|----------|--------|
| 🇲🇾 Malaysia | `Asia/Kuala_Lumpur` | MYR | `en-MY` |
| 🇮🇳 India | `Asia/Kolkata` | INR | `en-IN` |
| 🇦🇺 Australia | `Australia/Sydney` | AUD | `en-AU` |
| 🇸🇬 Singapore | `Asia/Singapore` | SGD | `en-SG` |
| 🇦🇪 UAE | `Asia/Dubai` | AED | `ar-AE` |
| 🇬🇧 UK | `Europe/London` | GBP | `en-GB` |
| 🇺🇸 USA | `America/New_York` | USD | `en-US` |

Each pack includes:
- Timezone, currency, locale rules
- Default outreach tone and formality level
- Job market source labels (e.g. MyJobStreet, Naukri, Seek)
- Optional compliance notes placeholder (PDPA, GDPR, etc.)

---

### 13. Visa & Immigration Rules Engine

Country-specific visa rules database with comprehensive work permit information:

| Feature | Description |
|---------|-------------|
| Visa Rules Database | 16 visa types across 7 countries (MY, SG, AU, AE, US, GB, IN) |
| Candidate Visa Tracking | Nationality, visa type, expiry date, status, foreigner flag |
| Visa Guide UI | Interactive country selector with expandable visa cards |
| AI Integration | Resume screening extracts visa/nationality data automatically |
| Expiry Alerts | Visual warnings for visas expiring within 90 days |

**Visa Categories:** WORK, DEPENDENT, STUDENT, VISITOR, PR

**API Endpoints:**
- `GET /api/v1/countries/visa-rules` — All visa rules grouped by country
- `GET /api/v1/countries/:code/visa-rules` — Rules for a specific country
- `GET /api/v1/countries/:code/visa-rules/:visaType` — Single rule detail

---

### 14. Role-Aware AI Resume Screening

Comprehensive AI-powered screening with role category detection:

| Role Category | Key Validation |
|---------------|---------------|
| 🏢 Executive | C-suite tenure, board experience, industry reputation |
| 💻 Technical | Certifications, hands-on tools, code/system architecture |
| 📊 Business | Revenue targets, client portfolio, market expansion |
| 💰 Finance | Certifications (CPA/ACCA), regulatory knowledge, audit experience |
| ⚙️ Operations | Supply chain, process optimization, team management |
| 🔧 Blue-Collar | Safety certs, physical skills, machinery operation |

**Scoring:** Skill Match (35%) + Experience Relevance (30%) + Role Alignment (20%) + Stability (15%)

**Decisions:** Shortlisted (≥70) | KIV (55-69) | Rejected (<55)

---

## 🖥️ UI Pages

| Page | Description |
|------|-------------|
| Dashboard Overview | KPIs, recent activity, workflow status |
| Tenant Settings | Branding, limits, country config, users |
| Integrations | All connected services + health status |
| Source Imports | Upload, review, retry import batches |
| Mapping Templates | Create, edit, and preview field mappings |
| Jobs | Job board with pipeline view |
| Candidates | Searchable candidate list with filters |
| Candidate Detail | Full profile, timeline, AI scores, visa info, outreach |
| Lead List | Filterable lead pipeline |
| Lead Detail | Company context, contacts, activity log |
| Outreach Drafts | Review and approve AI-generated messages |
| Visa Guide | Country-wise visa rules with eligibility, docs, fees |
| Workflow Executions | Per-run logs and status |
| Error Center | Grouped failures, retry controls |
| Analytics | Charts, funnels, AI usage, source performance |
| Country Config | Manage per-country settings |
| AI Prompt Templates | Version-controlled prompt library |

---

## 📊 Analytics

Track what matters most across recruitment and sales:

| Metric | Category |
|--------|----------|
| Candidates imported | Recruitment |
| Resumes parsed | Recruitment |
| Shortlist rate | Recruitment |
| Jobs filled | Recruitment |
| Leads imported | Sales |
| Leads qualified | Sales |
| Reply rate | Outreach |
| Meetings booked | Sales |
| Workflow failures | Operations |
| Import success rate | Operations |
| AI usage by tenant | Platform |
| Top-performing sources | Intelligence |
| Time saved estimate | ROI |

---

## 🔧 Backend & API Expectations

**Deliverables:**

```
📁 Folder structure (clean modular architecture)
🗄️ DB schema + migrations
🧱 Service layer with repository pattern
🔌 REST API routes + webhook endpoints for n8n
📋 DTOs / request validation
⚙️ Job queue structure (BullMQ or similar)
📝 Logging and tracing design
```

**API Design Principles:**

- All write endpoints validate against canonical schema
- All tenant-scoped endpoints enforce tenant isolation
- Webhook endpoints for n8n return `{ status, workflowRunId, errors }`
- All paginated list endpoints return `{ data, meta: { total, page, limit } }`

---

## 🛡️ Reliability Rules

| Rule | Principle |
|------|-----------|
| ✅ Idempotent imports | Re-running an import must not create duplicates |
| ✅ Testable integrations | Every integration has a test-connection mechanism |
| ✅ Auditable workflow runs | Every n8n execution stored with full audit trail |
| ✅ Visible failures | No silent mapping or execution failures |
| ✅ Normalization enforced | No direct source → workflow logic without schema transform |
| ✅ Tenant isolation | Zero cross-tenant data leakage |
| ✅ No hardcoded country logic | All locale rules driven by config, not code |

---

## 📚 Documentation Tasks

| Document | Status |
|----------|--------|
| `README.md` | ✅ This file |
| Architecture Overview | ✅ `ARCHITECTURE.md` |
| n8n Workflow Guide | ✅ `N8N_GUIDE.md` |
| Deployment Guide | ✅ `DEPLOYMENT.md` |
| Pipeline Stages | ✅ Sourced → Screened → Interviewing → Offered → Placed / Rejected / Withdrawn |
| Lead Stages | ✅ New → Contacted → Qualified → Proposal → Negotiation → Closed Won / Closed Lost |
| Visa Data | ✅ 16 rules, 7 countries, 2025-2026 data with immigration portal links |
| Live Server | ✅ https://growth.srpailabs.com |

---

## 📦 Delivery Format

Implementation will be delivered in this sequence:

```
Phase 1 — Architecture & Design
  ├── High-level architecture diagram
  ├── Recommended folder structure
  ├── Canonical DB schema
  ├── API route design
  ├── n8n integration strategy
  ├── Mapping engine design
  ├── Multi-country config design
  ├── Workflow list
  └── UI screen wireframes

Phase 2 — Implementation Priority Plan
  └── Prioritized sprint breakdown

Phase 3 — Code Generation (step-by-step)
  ├── Core models
  ├── Validation layer
  ├── Normalization / mapping engine
  ├── Workflow run tracking
  ├── Integration registry
  ├── Candidate and lead services
  ├── n8n webhook endpoints
  ├── AI service abstraction
  └── Dashboard APIs
```

---

## 🤖 AI Prompt: Resume Screening

> **Used by:** `AI Services Layer → CANDIDATE_SCORING / RESUME_PARSER`
> **Trigger:** Automatically on candidate import, or manually from candidate detail page
> **Output:** Strict JSON — fed directly into the Scorecard entity

```
You are an expert technical recruiter specializing in AI, automation, and software engineering roles.

You will receive:
1) A Job Description
2) A Candidate Resume

Your task is to perform a strict, evidence-based screening evaluation.

CRITICAL RULES:
- Only use information explicitly present in the resume and job description
- Do NOT assume or infer missing information
- If any detail is not found, return "Not Found"
- Be objective and consistent
- Focus on CURRENT and RELEVANT experience (recent roles matter more than old/irrelevant ones)

--------------------------------------------------
STEP 1: EXTRACT CANDIDATE PROFILE
--------------------------------------------------
Extract the following:

- Full Name
- Current Role
- Current Company
- Total Experience (years)
- Relevant Experience (years aligned to JD)
- Key Skills (top 10)
- Current Location
- Notice Period (if available)

--------------------------------------------------
STEP 2: JOB MATCH ANALYSIS
--------------------------------------------------

Evaluate the candidate based on:

1. Skill Match
   - Match required skills from JD with candidate skills
   - Highlight matched vs missing skills

2. Experience Relevance
   - Consider ONLY relevant and recent experience
   - Ignore outdated or unrelated experience
   - Check domain, tools, and role similarity

3. Role Alignment
   - Compare candidate's current/last role with JD role
   - Check seniority level match

4. Stability Check
   - Identify frequent job changes (if visible)

5. Red Flags (if any)
   - Missing critical skills
   - Role mismatch
   - Too junior/senior
   - Career gaps (if clearly visible)

--------------------------------------------------
STEP 3: SCORING
--------------------------------------------------

Provide a score between 0–100 based on:

- Skills match        (40%)
- Relevant experience (30%)
- Role alignment      (20%)
- Stability           (10%)

Guidelines:
- 80–100 = Strong fit
- 65–79  = Good fit
- 50–64  = Moderate fit
- Below 50 = Weak fit

--------------------------------------------------
STEP 4: FINAL DECISION
--------------------------------------------------

Based on score:
- 80+    → "Strong Shortlist"
- 65–79  → "Shortlist"
- 50–64  → "Keep in View (KIV)"
- Below 50 → "Rejected"

--------------------------------------------------
STEP 5: OUTPUT FORMAT (STRICT JSON)
--------------------------------------------------

Return ONLY valid JSON (no extra text):

{
  "candidate_profile": {
    "full_name": "",
    "current_role": "",
    "current_company": "",
    "total_experience_years": "",
    "relevant_experience_years": "",
    "key_skills": [],
    "current_location": "",
    "notice_period": ""
  },
  "match_analysis": {
    "skill_match": {
      "matched_skills": [],
      "missing_skills": []
    },
    "experience_relevance": "",
    "role_alignment": "",
    "stability": "",
    "red_flags": []
  },
  "score": 0,
  "decision": "",
  "summary": ""
}

--------------------------------------------------
STEP 6: SUMMARY RULE
--------------------------------------------------

Write a 2–3 line recruiter-style summary:
- Why this candidate is suitable or not
- Keep it sharp and decision-focused
```

### Decision → Pipeline Stage Mapping

| AI Decision | Pipeline Stage | Action |
|-------------|---------------|--------|
| `Strong Shortlist` | `SCREENED` → `INTERVIEWING` | Auto-advance + notify recruiter |
| `Shortlist` | `SCREENED` | Flag for recruiter review |
| `Keep in View (KIV)` | `SCREENED` | Hold in pool, no immediate action |
| `Rejected` | `REJECTED` | Archive + notify if needed |

### Scoring Weights

| Dimension | Weight | What is Evaluated |
|-----------|--------|-------------------|
| Skills Match | 40% | Required skills from JD vs candidate skills |
| Relevant Experience | 30% | Recent, domain-relevant work history |
| Role Alignment | 20% | Seniority + role type match |
| Stability | 10% | Job tenure patterns |

---

## 🌍 Product Direction

> **This platform must be useful today and scalable tomorrow.**

- **Internal use first** — built for SRP AI Labs' own recruitment and sales teams
- **SaaS-ready** — multi-tenant architecture supports future white-labelling
- **Adaptable** — easily extended for hospitals, HR agencies, and B2B service businesses
- **Reliable over flashy** — real-world operations demand predictability, not just speed
- **Modular** — each module can be adopted independently without breaking others

---

## 🔧 Changelog & Deployment History

### Round 3 Fixes — March 18, 2026

| Issue | Root Cause | Fix Applied |
|---|---|---|
| **Visa Guide shows "0 visa types"** | `VisaRule` table empty on production server | Seed runs on every deploy (`prisma db seed`) which upserts all 16 visa rules across 7 countries |
| **JD Parser returns nothing** | Frontend sent `{ text: jdText }` but `ParseJdDto` expects `{ jobDescription }` field | Fixed `aiApi.parseJd` in `api-client.ts` to send `{ jobDescription: text }`; also made backend accept both fields for backward compat |
| **AI Screen — PDF/Word upload error** | `POST /ai/parse-resume` was calling `jdParser.parse(text)` (returns JD structure) instead of returning extracted text | Fixed `parseResume` endpoint to return `{ resumeText, charCount }` so frontend populates the textarea correctly |
| **AI Screen — "Run AI Screening" fails** | `POST /ai/screen-resume` required `jobDescription` but frontend only sends `candidateId + jobId + resumeText` | Made `jobDescription` optional; if not supplied, backend auto-fetches the job description from DB using `jobId` |
| **Import page "Import failed" error** | Frontend sent `source: 'CSV_UPLOAD'` which is not a valid `ImportSource` enum value (valid: `CSV`, `EXCEL`, `MANUAL`, etc.) | Fixed `imports/page.tsx` to detect file type and send correct source: `.csv` → `CSV`, `.xlsx/.xls` → `EXCEL`, PDF/Word → `MANUAL`. Also improved error messages to show actual backend error |

All issues deployed to `growth.srpailabs.com` and verified E2E (HTTP 200 on all pages).

| Issue | Root Cause | Fix Applied |
|---|---|---|
| **Import fails with "Import failed"** | Frontend sent `importType: 'CANDIDATE'` (uppercase) but backend DTO validates lowercase `'candidate'` | Changed `imports/page.tsx` state type to `'candidate' \| 'lead'` (lowercase) |
| **Billing shows NaN%** | `UsageMeter` div-by-zero: `used / 0 = NaN` when no subscription and `limit = 0` | Added `hasNoLimit` guard in `UsageMeter`; shows "No active plan" instead of NaN% |
| **Enterprise plan shows $0** | Backend seed has `monthlyPrice: 0` for Enterprise tier (correct for "Custom") but UI displayed `$0` | Display "Custom" when `plan.tier === 'ENTERPRISE'` in billing page plan cards and current plan header |
| **Settings — "how to get API key"** | No guidance on where to get API keys for each provider | Added per-provider help banner with description + direct link (Apollo, LinkedIn, Hunter, Clearbit, SMTP, Slack, Webhook, Indeed) |
| **Candidate email opens native client** | Email button was `<a href="mailto:...">` — no AI personalization | Replaced with "AI Email" button calling `outreachApi.generate()` → shows AI-generated subject+body in modal with Copy + Open in email client options |
| **Visa Guide shows 0 visa types** | No VisaRule records in database | Seeded 16 visa rules across 7 countries (MY, SG, AU, AE, US, GB, IN) via `node prisma/seed.js` |
| **AI Screen no file upload** | AI screen page had dropzone locally but old version was deployed on server | SCP'd latest `ai/screen/page.tsx` to server and rebuilt frontend container |
| **Landing page old prices ($49/$129/$299/$799)** | `page.tsx` was not deployed in previous round | SCP'd landing `page.tsx` to server (shows Free/$19/$49/Custom) and rebuilt |

### Round 1 Fixes — Previous Session

| Issue | Fix |
|---|---|
| Companies page shows wrong total count | `data?.total` → `data?.meta?.total` |
| Jobs page shows "not found" on empty state | Added "Post your first job" empty state card |
| Leads page confusing AI Score/Stage | Complete rewrite: stage labels with emoji, AI Score explanation banner, "Run AI Score" button |
| New lead form missing | Created `leads/new/page.tsx` |
| Lead detail page missing | Created `leads/[id]/page.tsx` |
| Imports page 2-step confusing UX | Replaced with single drag-and-drop (create + upload in one step) |
| Dashboard all zeros confusing | Added "Get Started" 3-step quickstart guide when all metrics are 0 |

### Login Credentials (Demo)
```
Email:    admin@srp-ai-labs.com
Password: Admin@123
URL:      https://growth.srpailabs.com
```

### Server Deploy Commands
```bash
# SCP a frontend file
scp frontend/src/app/(dashboard)/PAGE/page.tsx root@5.223.67.236:/opt/growth-platform/frontend/src/app/(dashboard)/PAGE/page.tsx

# Rebuild & restart frontend only
ssh root@5.223.67.236 "cd /opt/growth-platform && docker compose -f docker-compose.prod.yml build frontend && docker compose -f docker-compose.prod.yml up -d frontend"

# Re-run seed (demo data + visa rules)
ssh root@5.223.67.236 "docker cp backend/prisma/seed.js growth_backend:/app/prisma/seed.js && docker exec growth_backend node prisma/seed.js"
```

---

## 🔒 Security & Hardening (v2 — June 2026)

### Critical Security Fixes Applied

| Fix | Description |
|-----|-------------|
| **C1** Cross-tenant job lookup | `tenantId` filter enforced on all job queries in AI controller |
| **C2** Missing WorkflowType enum | Added `CANDIDATE_SCREENING` value + migration `20260323000001` |
| **C3** Unhandled Prisma errors | Created `GlobalExceptionFilter` mapping P2002/P2025/P2003 → proper HTTP codes |
| **C4** Weak JWT secret guard | `auth.config.ts` throws at startup if `JWT_SECRET` is missing or fewer than 32 chars |
| **C5** Dead BullMQ processors | Registered `DedupeProcessor`, `EnrichmentProcessor`, `OutreachProcessor` in `app.module.ts` |
| **C6** Cross-tenant updateMany | `tenantId` added to `applications.updateMany` scoping |
| **C7** Password log exposure | Removed raw password from authentication log entries |
| **C8** Cross-tenant login | Multi-user email ambiguity resolved — `tenantSlug` required for tenant-scoped login |
| **C9** Swagger in production | Swagger UI gated behind `NODE_ENV !== 'production'` guard |
| **C10** n8n wrong backend port | Fixed `4000 → 3001` in all 5 n8n workflow JSON files |

### High / Medium Priority Fixes

| Fix | Description |
|-----|-------------|
| **H1** Unauthenticated `/health` | Root health endpoint is public; detailed `/api/v1/health` requires auth |
| **H2** Refresh token rotation | Implemented secure refresh token rotation with 7-day expiry |
| **H3** Rate limiting | Applied `@nestjs/throttler` on auth endpoints (login, register) |
| **H4** File type validation | Resume upload validates MIME type + extension whitelist (PDF, DOCX) |
| **H5** CORS lockdown | `ALLOWED_ORIGINS` env var enforced — no wildcard `*` in production |
| **H6** Helmet headers | HTTP security headers applied via `@nestjs/helmet` |
| **H8** Audit logging | `AuditService` logs create/update/delete mutations with actor + IP |
| **M1** TOCTOU race condition | Idempotent `upsert` patterns across candidates/leads/companies services |
| **M2** Timing attack on email | `bcrypt.compare` called even for non-existent users to prevent email enumeration |

---

## 🚀 Platform Enhancements (v2 — June 2026)

### Navigation & UX (Phase 2)

The sidebar was rewritten from a flat 12-item list to a **grouped, collapsible navigation**:

| Group | Pages |
|-------|-------|
| Recruitment | Candidates, Jobs, Applications, AI Screening, Resume Imports |
| Sales | Leads, Companies, Contacts, Outreach |
| Automations | Imports, Workflows, Integrations, Error Logs |
| Settings | Billing, Settings, Users & Roles (admin only), Visa Guide |

**New pages added:**

| Page | Route | Purpose |
|------|-------|---------|
| Applications | `/applications` | Application tracking with status filter tabs |
| Contacts | `/contacts` | Sales CRM contact list with search |
| Workflows | `/workflows` | Workflow run history with status/duration |
| Integrations | `/integrations` | Integration registry (n8n, OpenRouter, SMTP, etc.) |
| Error Logs | `/errors` | Audit-based error viewer with stack trace expand |
| Users & Roles | `/users` | User management (admin-only, role-gated) |
| LinkedIn AI | `/linkedin` | AI content generator for LinkedIn |

### Database Schema (Phase 3)

- Added `deletedAt DateTime?` soft-delete field to **Job**, **Company**, **Contact**, **IcpProfile**
- Added partial indexes `WHERE "deletedAt" IS NULL` for all soft-deleted models
- Added `LINKEDIN_CONTENT` to `AiServiceType` enum
- Fixed missing `@relation` declarations for `Contact`, `Scorecard`, `Activity`, `IcpProfile` → `Tenant`
- Migration: `20260323000002_soft_delete_and_tenant_relations`

### LinkedIn AI Assistant (Phase 6)

New endpoint: `POST /api/v1/ai/linkedin`

Supports 6 content types:

| Type | Output |
|------|--------|
| `linkedin_post` | Thought-leadership post draft |
| `linkedin_connection` | Personalised connection request note |
| `linkedin_inmail_recruiter` | Recruiter InMail for active candidates |
| `linkedin_inmail_sales` | Sales InMail/SDR cold outreach |
| `linkedin_profile_about` | LinkedIn About section rewrite |
| `linkedin_comment` | Engaging comment on a post |

All generations are logged to `AiUsageLog` (model, tokens, latency).

### Tenant Onboarding (Phase 7)

New `TenantOnboardingService` auto-runs after every tenant creation (fire-and-forget):

- Seeds 2 default CSV mapping templates (candidates, leads)
- Seeds 1 default ICP profile with common seniority/title keywords
- Seeds 1 default outreach prompt template

All operations are fully **idempotent** — safe to re-run via `POST /api/v1/tenants/:id/onboard`.

### Health Check Module (Phase 8)

`GET /api/v1/health` returns live dependency status:

```json
{
  "status": "ok",
  "timestamp": "2026-06-01T12:00:00.000Z",
  "checks": {
    "database": { "status": "ok", "latencyMs": 4 },
    "redis": { "status": "ok", "latencyMs": 1 }
  }
}
```

### Dead Letter Queue (Phase 8)

All 3 BullMQ processors (`dedupe`, `enrichment`, `outreach`) now persist failed jobs to the `WorkflowRun` table with `status = 'FAILED'`. Query dead-letter items:

```sql
SELECT * FROM "WorkflowRun" WHERE status = 'FAILED' ORDER BY "createdAt" DESC;
```

### Redis Caching (Phase 10)

Global `CacheService` (ioredis, graceful degradation — never crashes if Redis is down).

All 4 analytics methods are cached:

| Method | Cache Key | TTL |
|--------|-----------|-----|
| `getRecruitmentSummary` | `analytics:recruitment:{tenantId}:{days}` | 5 min |
| `getSalesSummary` | `analytics:sales:{tenantId}:{days}` | 5 min |
| `getAiUsage` | `analytics:ai-usage:{tenantId}:{days}` | 5 min |
| `getDashboardKpis` | `analytics:dashboard:{tenantId}` | 2 min |

Inject `CacheService` anywhere — it's a `@Global()` module.

### Deployment Scripts (Phase 9)

All scripts in `scripts/`:

| Script | Purpose |
|--------|---------|
| `backup-db.sh` | pg_dump with timestamp, pruned to 7 backups |
| `restore-db.sh` | Drop/recreate schema, restore from file |
| `pre-deploy.sh` | Backup DB + pull + migrations + build |
| `verify-health.sh` | Curl health endpoints with 10-retry logic |
| `rollback.sh` | Stop → restore DB → restart → verify |

---

<div align="center">

**Built by SRP AI Labs** · Powered by n8n + AI + Clean Architecture

</div>
