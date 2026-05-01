# Sales CRM ↔ Recruitment — Integration & Data Mapping

**Project:** SRP AI Growth  
**Powered by:** SRP AI Labs  
**Status:** ✅ DB Foundation Done | 🔶 Workflow Integration In Progress  
**Last Updated:** April 2026

---

## 1. Why This Integration Matters

SRP AI Growth's competitive edge is the **end-to-end pipeline**: AI generates leads, Sales qualifies and converts them to clients, raises job requirements, and assigns recruiters — all inside one platform. The Submission record is the handshake where Recruitment's work becomes visible to Sales, and Sales's client feedback flows back to Recruitment.

---

## 2. Commercial Boundary — The Non-Negotiable Rule

```
┌─────────────────────────────────────┐        ┌─────────────────────────────────────┐
│            SALES CRM                │        │         RECRUITMENT ATS              │
│                                     │        │                                      │
│  Leads → Companies → Clients        │        │  Candidates → Screenings             │
│  Contacts                           │        │  Applications                        │
│  JDs (create + own)  ───────────────────────►│  JDs (view assigned only)           │
│  Billing / Commercials [LOCKED]     │        │  [commercial fields HIDDEN]          │
│  Client Feedback        ◄───────────────────── Submissions (created by Recruiter)  │
│  Proposals / Agreements             │        │  Interviews                          │
└─────────────────────────────────────┘        └─────────────────────────────────────┘
                          ▲                                     ▲
                          │        SHARED ENTITIES              │
                          │   SRP-JD-XXXX   SRP-SUB-XXXX       │
                          └─────────────────────────────────────┘
```

**This boundary must be enforced at the API — not just hidden in the UI.**

---

## 3. What Is Connected Today

| Connection | Schema | Backend Enforced | Frontend | Status |
|-----------|--------|-----------------|---------|--------|
| Job links to Client (`job.clientId`) | ✅ | partial | partial | **DB done** |
| JD assigned to Recruiter (`job.assignedRecruiterId`) | ✅ | ❌ no filter | ❌ | **Phase 02** |
| Submission visible in Client 360 | ✅ | ✅ | ✅ | **DONE** |
| Submission visible in Submissions list | ✅ | ✅ | ✅ | **DONE** |
| Submission visible in Candidate 360 | ✅ | ✅ | ❌ tab missing | **Phase 03** |
| Submission visible in JD 360 | ✅ | ✅ | ❌ tab missing | **Phase 02** |
| Commercial fields hidden from Recruiter | ✅ schema | ❌ not stripped | ❌ | **Phase 06** |
| Client Feedback on Submission | ✅ `clientFeedback` field | ✅ endpoint | ❌ no UI | **Phase 04** |
| Lead → Client conversion (`convertedToClientId`) | ✅ | partial | ❌ | **Phase 01** |
| Company → Client (`isClient`, `clientId`) | ✅ | partial | ❌ | **Phase 01** |

---

## 4. Full End-to-End Pipeline

```
[SALES CRM]
    │
    ├─ 1. AI generates Lead (SRP-LD-XXXX)
    │       source: Apollo / Apify / Google Maps / CSV
    │       ↓
    ├─ 2. Lead scored against ICP (score + scoreDetails stored)
    │       ↓
    ├─ 3. Company created / linked (SRP-COM-XXXX)
    │       ↓
    ├─ 4. "Convert to Client" → Client created (SRP-CL-XXXX)   ← Phase 01 UI
    │       lead.convertedToClientId = client.id
    │       ↓
    ├─ 5. JD created under Client (SRP-JD-XXXX)   ← Phase 02
    │       job.clientId = client.id  [required]
    │       ↓
    ├─ 6. Sales assigns Recruitment Manager + Recruiters to JD   ← Phase 02
    │       job.recruitmentManagerId, job.assignedRecruiterIds[]
    │
    │                          [RECRUITMENT ATS]
    │                              │
    │                          ├─ 7. JD appears in Recruiter's Jobs list (assigned only)   ← Phase 02
    │                          │       commercial fields (billingRate, payRate) HIDDEN
    │                          │       ↓
    │                          ├─ 8. Recruiter sources Candidate (SRP-CAN-XXXX)
    │                          │       ↓
    │                          ├─ 9. AI Screening run against JD
    │                          │       Application created (SRP-APP-XXXX) — candidateId + jobId unique
    │                          │       ↓
    │                          ├─10. Recruiter creates Submission (SRP-SUB-XXXX)   ← Phase 04 detail
    │                          │       submission: clientId + jobId + candidateId unique
    │                          │
    │ ◄─────────────────────────────  Submission visible in Sales: Client 360 + JD 360
    │
    ├─11. Sales validates → "Submitted to Client" stage
    │       ↓
    ├─12. Client Feedback entered by Sales   ← Phase 04 UI
    │       submission.clientFeedback updated
    │       ↓  Notification to Recruiter   ← Phase 07
    ├─13. Interview scheduled (SRP-INT-XXXX)   ← Phase 04
    │       ↓
    ├─14. Offer → Joined
    │       candidate.stage = PLACED
    │       client closure count incremented
    │       ↓
    └─15. Placement visible across:
          Candidate 360 / JD 360 / Client 360 / Submissions list
```

---

## 5. Entity Relationship Map

```
Tenant
 ├── Lead (SRP-LD-XXXX)
 │    └── [converted_to] ──────────────────────► Client (SRP-CL-XXXX)
 ├── Company (SRP-COM-XXXX)
 │    └── [converted_to] ──────────────────────► Client
 │
 └── Client (SRP-CL-XXXX)
      ├── Contact[] (SRP-CNT-XXXX)
      ├── Job/JD[] (SRP-JD-XXXX)
      │    ├── assignedRecruiters → User[]
      │    ├── Application[]
      │    │    └── Candidate (SRP-CAN-XXXX)
      │    │         ├── Resume[]
      │    │         └── AiAnalysisResult[]
      │    ├── Submission[] (SRP-SUB-XXXX)
      │    │    ├── Candidate (SRP-CAN-XXXX)
      │    │    ├── Recruiter → User
      │    │    ├── Sales Owner → User
      │    │    └── Interview[] [Phase 04]
      │    └── [booleanSearch field] [Phase 02]
      ├── Opportunity[] (SRP-OPP-XXXX)
      ├── Proposal[] (SRP-PROP-XXXX)
      ├── FollowUp[]
      └── Document[]
```

---

## 6. Shared Entity: JD — Per-Role Field Access

| JD Field | Sales | Finance | Rec. Manager | Recruiter |
|----------|:-----:|:-------:|:------------:|:---------:|
| Title, Location, Skills | ✅ edit | ✅ view | ✅ view | ✅ view |
| Job Description | ✅ edit | ✅ view | ✅ view | ✅ view |
| Priority, Status (Open/Close) | ✅ edit | ❌ | ❌ | ❌ |
| Assigned Recruiters | ✅ edit | ❌ | ❌ | ❌ |
| `billingRate` | ✅ edit | ✅ view | ❌ hidden | ❌ hidden |
| `candidatePayRate` | ✅ edit | ✅ view | ❌ hidden | ❌ hidden |
| `paymentTerms` (on Client) | ✅ edit | ✅ view | ❌ hidden | ❌ hidden |
| Recruitment Stage / Notes | ✅ view | ❌ | ✅ edit | ✅ edit |
| Boolean Search | ✅ view | ❌ | ✅ view | ✅ view |

**API enforcement status:** ❌ Not yet implemented → Phase 06

---

## 7. Shared Entity: Submission — Stage Ownership

| Stage | Who Can Set It |
|-------|---------------|
| Draft | Recruiter |
| Internal Review | Recruiter |
| Submitted to Sales | Recruiter |
| Submitted to Client | Sales |
| Client Review | Sales |
| Interview | Sales (schedules) + Recruiter (tracks) |
| Offer | Sales |
| Joined | Sales |
| Rejected | Either |
| Withdrawn | Either |

### Submission Cross-Module Visibility

| Location | Current State | Target |
|----------|--------------|--------|
| `/submissions` global list | ✅ Built | ✅ Done |
| Client 360 → Submissions tab | ✅ Built | ✅ Done |
| Candidate 360 → Submissions tab | ❌ Tab missing | Phase 03 |
| JD 360 → Submissions tab | ❌ Tab missing | Phase 02 |
| Submission detail `/submissions/[id]` | ❌ No page | Phase 04 |

---

## 8. Phase-by-Phase Integration Build Plan

### Phase 01 — Sales CRM Completion (current priority)

| Task | Impact on Integration |
|------|----------------------|
| Lead → Client conversion UI | Enables Sales to have Clients in system to create JDs under |
| Client 360 — Contacts tab | Sales can track who at the client company to interact with |
| Client 360 — KPI cards | Sales can see recruitment pipeline health per client |
| ICP Score explanation panel | Gives Sales clear reason to pursue/deprioritise leads |

### Phase 02 — JD Ownership + Recruiter Assignment

| Task | Impact on Integration |
|------|----------------------|
| JD require `clientId` on create | Every JD belongs to a Client — no orphaned JDs |
| Multi-recruiter assignment | Multiple recruiters can work one JD |
| Recruiter filtered JD list | Recruiters only see JDs assigned to them |
| JD 360 → Submissions tab | Sales and Recruitment both see submissions under a JD |
| JD 360 → Client Feedback tab | Feedback from client visible to Recruitment Manager |
| Boolean Search modal | Recruiters get AI-generated search strings |

### Phase 03 — Candidate 360 Completeness

| Task | Impact on Integration |
|------|----------------------|
| Candidate 360 → Submissions tab | Recruiter sees all clients/JDs this candidate was submitted to |
| Candidate 360 → Emails tab | Recruiter sees outreach history |
| Candidate list → Client column | Recruiter sees which client is currently interested in a candidate |

### Phase 04 — Submission + Interview Workflow

| Task | Impact on Integration |
|------|----------------------|
| Submission detail page | Full workflow management — stage changes, feedback, offer |
| Client Feedback UI | Sales enters feedback; Recruiter sees it immediately |
| Interviews module | Structured interview tracking tied to Submission |
| Interview in Candidate 360 | Candidate history complete |

### Phase 06 — RBAC Hardening

| Task | Impact on Integration |
|------|----------------------|
| Strip commercial fields from Recruiter responses | Commercial boundary enforced at API |
| Filter JD list by `assignedRecruiterId` server-side | Recruiter cannot see unassigned JDs |
| Restrict submission feedback to Sales role | Only Sales can enter/edit `clientFeedback` |
| Audit log for all cross-module events | Full trail of who did what |

### Phase 07 — Notifications

| Task | Impact on Integration |
|------|----------------------|
| Notify Recruiter when JD assigned | Recruiter knows immediately when they have work |
| Notify Sales when submission created | Sales sees new CV in their pipeline |
| Notify Recruiter when client feedback added | Closes the feedback loop |
| Notify on Offer/Joined | Both teams celebrate the win together |

---

## 9. Real ID Chain — A Complete Placement Example

```
SRP-LD-0023   Lead: "HR Director, Acme Corp" (Apollo import)
    ↓ scored 82 (Strong Fit)
    ↓ Convert to Client
SRP-CL-0005   Client: Acme Corp · Sales Owner: Sarah
    ↓ JD created
SRP-JD-0012   JD: Senior Java Developer · KL · MYR 10k–13k
    ↓ Assigned to Recruiter
User: shashank@srpailabs.com
    ↓ screens
SRP-CAN-0087  Candidate: Rajesh Kumar · 8 yrs · Java, Spring, AWS
    ↓ AI Screening
AiAnalysisResult: Score 84 · Match: Strong · Skills match 9/11
    ↓ creates
SRP-APP-0031  Application: Rajesh × JD-0012 · stage: SCREENED
    ↓ Recruiter submits
SRP-SUB-0019  Submission: Rajesh → Acme Corp → JD-0012
              recruiter: Shashank · salesOwner: Sarah
    ↓ Sales: Submitted to Client
    ↓ Client Feedback: "Shortlisted — send for interview"
    ↓
SRP-INT-0007  Interview: Round 1 · Video · 5 May 2026
              status: Completed · feedback: "Strong candidate"
    ↓
SRP-SUB-0019.stage = "Joined"
SRP-CAN-0087.stage = "PLACED"
Acme Corp KPI: Closures +1
```

---

## 10. Integration Health Checklist (Pre-launch)

| Check | Pass Criteria |
|-------|---------------|
| Sales creates JD with `clientId` required | Cannot save JD without Client |
| Recruiter opens Jobs list — only assigned JDs | Unassigned JDs not in list |
| Recruiter opens JD — `billingRate` not in API response | HTTP 200 but field absent |
| Recruiter submits candidate — Submission created | `SRP-SUB-XXXX` record in DB |
| Submission visible in Client 360 | Shows in Submissions tab |
| Submission visible in Candidate 360 | Shows in Submissions tab |
| Submission visible in JD 360 | Shows in Submissions tab |
| Sales adds Client Feedback | `submission.clientFeedback` updated + audit log |
| Interview created and shows in Candidate 360 | Interviews tab populated |
| Offer → Joined: Candidate stage = PLACED | `candidate.stage` updated |
| All state changes have audit log entries | `audit_logs` table populated |
| Commercial fields: 403 for Recruiter | API returns 403 on commercial routes |

---

## 11. Related Documents

| Document | Description |
|----------|-------------|
| [RECRUITMENT.md](RECRUITMENT.md) | Recruitment ATS — full module reference |
| [SALES-CRM.md](SALES-CRM.md) | Sales CRM — full module reference |
| [../ROADMAP.md](../ROADMAP.md) | Phase-wise build plan with all tasks |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Tech stack, infrastructure, data flow |
