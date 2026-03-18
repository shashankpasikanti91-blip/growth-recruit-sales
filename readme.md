<div align="center">

# 🚀 Recruitment + Sales Agentic Automation Platform

**Production-ready multi-tenant automation platform for SRP AI Labs**

[![Status](https://img.shields.io/badge/status-in%20development-yellow?style=for-the-badge)]()
[![Multi-Tenant](https://img.shields.io/badge/multi--tenant-yes-blue?style=for-the-badge)]()
[![AI Powered](https://img.shields.io/badge/AI-powered-purple?style=for-the-badge)]()
[![n8n](https://img.shields.io/badge/orchestration-n8n-orange?style=for-the-badge)]()
[![Countries](https://img.shields.io/badge/countries-7%2B-green?style=for-the-badge)]()

> A scalable, modular system that unifies **recruitment automation**, **sales pipeline**, and **AI-driven workflows** across multiple countries, industries, and tenants — built for reliability, not just speed.

</div>

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
| Pipeline Stages | Sourced → Screened → Interviewing → Offered → Placed |
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
| Pipeline Stages | New → Contacted → Qualified → Proposal → Closed |
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
| Candidate Detail | Full profile, timeline, AI scores, outreach |
| Lead List | Filterable lead pipeline |
| Lead Detail | Company context, contacts, activity log |
| Outreach Drafts | Review and approve AI-generated messages |
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
| Architecture Overview | 🔲 To do |
| Integration Setup Guide | 🔲 To do |
| n8n Workflow Guide | 🔲 To do |
| `.env.example` | 🔲 To do |
| Deployment Checklist | 🔲 To do |
| Troubleshooting Guide | 🔲 To do |
| Field Mapping Guide | 🔲 To do |
| Multi-Country Config Guide | 🔲 To do |

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

<div align="center">

**Built by SRP AI Labs** · Powered by n8n + AI + Clean Architecture

</div>
