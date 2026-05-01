# Recruitment ATS — Module Reference

**Project:** SRP AI Growth  
**Powered by:** SRP AI Labs  
**Status:** ✅ Core Done | 🔶 Enhancements In Progress  
**Last Updated:** April 2026

> **No wipe code. No breaking existing records. Extend only.**

---

## 1. What Is Built Today

| Feature | DB Schema | Backend | Frontend | Status |
|---------|-----------|---------|---------|--------|
| Candidates list | ✅ | ✅ | ✅ | **DONE** |
| Candidate 360 — Overview | ✅ | ✅ | ✅ | **DONE** |
| Candidate 360 — Resume | ✅ | ✅ | ✅ | **DONE** |
| Candidate 360 — Applications | ✅ | ✅ | ✅ | **DONE** |
| Candidate 360 — AI Screening | ✅ | ✅ | ✅ | **DONE** |
| Candidate 360 — Notes | ✅ | ✅ | ✅ | **DONE** |
| Candidate 360 — Timeline | ✅ | ✅ | ✅ | **DONE** |
| Candidate 360 — Submissions tab | ✅ | ✅ | ❌ | **Phase 03** |
| Candidate 360 — Interviews tab | ❌ | ❌ | ❌ | **Phase 04** |
| Candidate 360 — Emails tab | ✅ | ✅ | ❌ | **Phase 03** |
| Candidate 360 — Documents tab | ✅ | ✅ | ❌ | **Phase 03** |
| Jobs / JDs list | ✅ | ✅ | ✅ | **DONE** |
| JD 360 — Overview | ✅ | ✅ | ✅ | **DONE** |
| JD 360 — Applications | ✅ | ✅ | ✅ | **DONE** |
| JD 360 — Submissions tab | ✅ | ✅ | ❌ | **Phase 02** |
| JD 360 — Client Feedback tab | ✅ | ✅ | ❌ | **Phase 02** |
| JD 360 — Assigned Recruiters tab | ✅ | partial | ❌ | **Phase 02** |
| JD 360 — Boolean Search modal | ✅ field | ❌ | ❌ | **Phase 02** |
| JD 360 — Commercials tab | ✅ | partial | ❌ | **Phase 06** |
| Applications list | ✅ | ✅ | ✅ | **DONE** |
| Submissions list (basic) | ✅ | ✅ | ✅ | **DONE** |
| Submission detail page | ✅ | ✅ | ❌ | **Phase 04** |
| Bulk AI Screening | ✅ | ✅ | ✅ | **DONE** |
| Interviews module | ❌ | ❌ | ❌ | **Phase 04** |
| Talent Pool | ❌ | ❌ | ❌ | **Phase 05** |
| Duplicate candidate detection UI | ✅ flag | partial | ❌ | **Phase 03** |
| Resume parsing — structured UI | ✅ JSON | ✅ | partial | **Phase 03** |
| Candidate list — Parsing Status col | ❌ | ✅ | ❌ | **Phase 03** |
| Candidate list — Client col | ✅ | ✅ | ❌ | **Phase 03** |
| RBAC commercial fields — API level | ✅ schema | ❌ | ❌ | **Phase 06** |
| Recruiter sees assigned JDs only | ✅ schema | ❌ | ❌ | **Phase 02** |

---

## 2. Global ID Reference

| Entity | ID Format | Stored As |
|--------|-----------|-----------|
| Candidate | `SRP-CAN-XXXX` | `candidate.businessId` |
| Job / JD | `SRP-JD-XXXX` | `job.businessId` |
| Application | `SRP-APP-XXXX` | `application.businessId` |
| Submission | `SRP-SUB-XXXX` | `submission.businessId` |
| Interview | `SRP-INT-XXXX` | to be added in Phase 04 |

**Rules:**
- `candidateId + jobId` is unique on `applications` — cannot duplicate.
- `clientId + jobId + candidateId` is unique on `submissions` — cannot duplicate.
- Candidate ID never changes — it follows the candidate through every stage.

---

## 3. Recruitment Sidebar Structure

```
RECRUITMENT
├── Candidates
├── Jobs / JDs
├── Applications
├── Submissions
├── Interviews            ← Phase 04
└── Talent Pool           ← Phase 05
```

---

## 4. Candidates — List Page

**URL:** `/candidates` | **Status:** ✅ Built

### Current Columns (All Built)

| Column | Notes |
|--------|-------|
| Candidate ID (`businessId`) | Copy button, always visible |
| Full Name | |
| Email | |
| Phone | |
| Current Role | |
| Current Company | |
| Experience | Years from `yearsExperience` |
| Location | |
| Visa Status | Citizen / PR / Valid / Expiring / Expired |
| Skills | Top 5 shown |
| AI Score | ≥75 Hire-Ready · ≥55 KIV · <55 Reject |
| Stage | SOURCED → PLACED |
| Star Rating | 0–5 stars |
| Notice Period | Human-readable (30d, 4w, 2mo) |
| Source | |
| Last Activity | |
| Created Date | Dual-format |
| Actions | View, Screen, Bulk select |

### Columns to Add — Phase 03

| Column | Source |
|--------|--------|
| Parsing Status | `resume.parsedData.confidence` |
| Client | Latest `submission → client.name` |
| Latest Screened JD | Latest `aiAnalysisResult → job.title` |

### Filters (All Built)

Stage · Visa Status · Experience range · Source · Skills · Search (name, email, skill)

---

## 5. Candidate 360 — Detail Page

**URL:** `/candidates/[id]` | **Status:** ✅ Core built

### Current Tabs

| Tab | Status | Contents |
|-----|--------|----------|
| Overview | ✅ | Name, contact, experience, skills, visa, IDs, star rating |
| Resume | ✅ | Upload, preview, download, replace, parse |
| Applications | ✅ | JDs applied, AI score, stage |
| AI Screening | ✅ | Sessions with score, recommendation, skills match |
| Notes | ✅ | Internal recruiter notes |
| Timeline | ✅ | Full activity log |

### Tabs to Add — Phase 03

| Tab | Contents |
|-----|----------|
| Submissions | All `Submission` records — client, JD, stage, feedback, dates |
| Emails | Outreach messages sent/drafted to this candidate |
| Documents | Certificates, ID docs attached to candidate |

### Tab to Add — Phase 04

| Tab | Contents |
|-----|----------|
| Interviews | All interviews — round, mode, date, status, feedback |

### Resume Tab — To Add — Phase 03

| Item | Notes |
|------|-------|
| Parsing Status badge | `Parsed` / `Needs Review` / `Pending` |
| Parser Confidence badge | `High` / `Medium` / `Low` |
| Structured fields from `parsedData` | Education, Nationality, Expected Salary, Notice Period |
| Resume version history | Show previous uploads with dates |

### AI Screening Tab — Rules (All Currently Enforced)

- ✅ Never re-runs on page refresh
- ✅ Loads saved result first
- ✅ Re-run only on explicit user confirmation
- ✅ Token usage tracked per tenant

---

## 6. Jobs / JDs — List Page

**URL:** `/jobs` | **Status:** ✅ Built

### Columns to Add — Phase 02

| Column | Source |
|--------|--------|
| Client Name | `job.clientId → client.name` |
| Assigned Recruiter(s) | `job.assignedRecruiterId` (→ multi in Phase 02) |
| Submitted Count | `submissions` count per job |
| Target Submission Date | `job.targetSubmissionDate` |
| Job Received Date | `job.jobReceivedDate` |

---

## 7. JD 360 — Detail Page

**URL:** `/jobs/[id]` | **Status:** ✅ Core built

### Current Tabs (Built)

| Tab | Contents |
|-----|----------|
| Overview | JD fields, description, KPI cards, actions |
| Applications | Candidates applied, AI score, stage change, inline screening |

### Tabs to Add — Phase 02

| Tab | Contents |
|-----|----------|
| Submissions | All submissions for this JD — recruiter, stage, score, feedback |
| Client Feedback | Sales-entered feedback per submission |
| Assigned Recruiters | List of recruiters working this JD + their activity |
| Boolean Search | Auto-generated boolean modal with copy button |

### Tab to Add — Phase 06

| Tab | Contents |
|-----|----------|
| Commercials | Billing rate, pay rate, markup — Sales/Finance/Admin only |

### JD 360 — Top KPI Cards (to add — Phase 02)

```
[ Open Positions ] [ Submitted CVs ] [ Screened ] [ Interviews ] [ Offers ] [ Days Open ] [ Target Date ]
```

### Boolean Search Spec

- Auto-generates from: `title + required skills + secondary skills + location`
- Stored in `job.booleanSearch`
- "View Boolean" button → opens modal (NOT inline)
- Modal: full string + Copy button
- Regenerate only when JD fields change

---

## 8. Applications

**URL:** `/applications` | **Status:** ✅ Built

**Unique constraint:** `candidateId + jobId` — enforced at DB level.

### Key Fields

`businessId` · `candidateId` · `jobId` · `stage` · `matchScore` · `scoreDetails` · `isShortlisted` · `isInterview` · `interviewDate` · `offerStatus` · `rejectionReason`

---

## 9. Submissions

**URL:** `/submissions` | **Status:** ✅ Basic list + new form | Detail page: Phase 04

**Unique constraint:** `clientId + jobId + candidateId` — enforced at DB level.

### Key Fields

`businessId` · `clientId` · `jobId` · `candidateId` · `recruiterId` · `salesOwnerId` · `stage` · `aiScore` · `recruiterNotes` · `clientFeedback` · `interviewDate` · `offerStatus` · `submittedAt`

### Submission Stages

```
Draft
 → Internal Review
   → Submitted to Sales
     → Submitted to Client
       → Client Review
         → Interview → Offer → Joined
       → Rejected
   → Withdrawn
```

### Stage Ownership

| Stage Transition | Who Can Do It |
|-----------------|---------------|
| Draft → Submitted to Sales | Recruiter |
| Submitted to Client → Joined | Sales |
| Any → Rejected / Withdrawn | Either |

### Cross-Module Visibility

| View | Current | Phase |
|------|---------|-------|
| Submissions list global | ✅ | Done |
| Client 360 → Submissions tab | ✅ | Done |
| Candidate 360 → Submissions tab | ❌ | Phase 03 |
| JD 360 → Submissions tab | ❌ | Phase 02 |
| Submission detail page | ❌ | Phase 04 |

---

## 10. Interviews Module — Phase 04

**Status:** 🔲 Not started. No model in schema yet.

### Planned Fields

| Field | Notes |
|-------|-------|
| `businessId` | Display ID |
| `submissionId` | FK → Submission |
| `candidateId` | FK → Candidate |
| `jobId` | FK → Job |
| `clientId` | FK → Client |
| `round` | Round 1 / 2 / Technical / HR / Final |
| `interviewerName` | |
| `scheduledAt` | |
| `mode` | In-person / Video / Phone |
| `meetingLink` | HTTPS, stored encrypted |
| `status` | Scheduled / Completed / Rescheduled / Cancelled / No Show / Selected / Rejected |
| `feedback` | |
| `createdById` | FK → User |

---

## 11. Talent Pool — Phase 05

**Status:** 🔲 Not started. No model in schema.

Planned: save candidate groups per JD or skill set; bulk AI match against a JD.

---

## 12. Duplicate Candidate Detection — Phase 03

**What's there:** `candidate.isDuplicate` flag, `candidate.duplicateOfId` field in schema.

**What to build:**
- On upload/create: check `email + phone + resumeHash`
- Alert dialog: "Candidate already exists — Update existing, Merge, or Cancel?"
- Merge flow: copy fields from duplicate into original

---

## 13. Role Permissions — Recruitment

| Action | Super Admin | Management | Rec. Manager | Recruiter |
|--------|:-----------:|:----------:|:------------:|:---------:|
| Create JD | ✅ | ❌ | ❌ | ❌ |
| Edit JD (recruitment fields: stage, notes) | ✅ | ✅ | ✅ | ✅ |
| Edit JD (commercial fields) | ✅ | ❌ | ❌ | ❌ |
| View JD (assigned only for Recruiter) | ✅ all | ✅ all | ✅ all | 🔵 assigned |
| Upload / create Candidate | ✅ | ✅ | ✅ | ✅ |
| View Candidate | ✅ all | ✅ all | ✅ all | 🔵 own |
| Screen Candidate (AI) | ✅ | ✅ | ✅ | ✅ |
| Submit Candidate | ✅ | ✅ | ✅ | ✅ |
| Add Client Feedback on Submission | ✅ | ❌ | ❌ | ❌ |
| Schedule Interview | ✅ | ✅ | ✅ | ✅ |
| Delete Candidate | ✅ | ✅ | ❌ | ❌ |
| Export Data | ✅ | ✅ | ✅ | ❌ |

> 🔵 = filtered to own/assigned records only  
> All API-level enforcement to be implemented in Phase 06.

---

## 14. Audit Events

All written to `audit_logs` with `entityId`, `entityType`, `action`, `userId`, `tenantId`, `createdAt`.

| Event | Trigger |
|-------|---------|
| `candidate.created` | Upload or import |
| `candidate.updated` | Any field edited |
| `candidate.resume_parsed` | Parsing completed |
| `candidate.duplicate_detected` | Duplicate check matched |
| `application.created` | First screening or manual apply |
| `application.stage_changed` | Stage moved |
| `screening.created` | AI result saved |
| `screening.rerun_confirmed` | Re-run by user |
| `submission.created` | Candidate submitted |
| `submission.stage_changed` | Stage progressed |
| `submission.feedback_updated` | Sales adds/edits client feedback |
| `interview.created` | Interview scheduled |
| `interview.status_changed` | Any status update |

---

## 15. Related Documents

| Document | Description |
|----------|-------------|
| [SALES-CRM.md](SALES-CRM.md) | Sales CRM module |
| [SALES-RECRUITMENT-INTEGRATION.md](SALES-RECRUITMENT-INTEGRATION.md) | Integration + data flow |
| [../ROADMAP.md](../ROADMAP.md) | Phase-wise build plan |
