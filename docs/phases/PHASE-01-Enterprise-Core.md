# Phase 01 — SRP Enterprise Core: Interview, Offer & RBAC Engine

**Status:** ✅ DONE  
**Goal:** Build the enterprise hiring workflow engine — Interviews, Offers, commercial access control, role-aware data views, and submission lifecycle events.

---

## 1.1 — Interview Module

| Task | Status | Notes |
|------|--------|-------|
| `Interview` Prisma model | ✅ | mode, status, round, scheduledAt, completedAt, meetingLink, feedback, rating 1-5, result, notes |
| Migration `20260420000001` | ✅ | `interviews` table with FK constraints + indexes |
| `POST /api/v1/interviews` | ✅ | Create interview linked to submission |
| `GET /api/v1/interviews` | ✅ | Filter by submissionId, candidateId, jobId, status |
| `GET /api/v1/interviews/stats` | ✅ | Aggregate: total, by status, by mode |
| `GET /api/v1/interviews/:id` | ✅ | Full relations: submission, candidate, job |
| `PUT /api/v1/interviews/:id` | ✅ | Update round, mode, status, feedback, rating 1-5, result |
| `DELETE /api/v1/interviews/:id` | ✅ | TENANT_ADMIN / SUPER_ADMIN only |

## 1.2 — Offer Module

| Task | Status | Notes |
|------|--------|-------|
| `Offer` Prisma model | ✅ | offeredSalary, currency, joiningDate, expiryDate, offerLetterUrl, status, declineReason |
| Migration `20260420000001` | ✅ | `offers` table |
| `POST /api/v1/offers` | ✅ | Sales-only; active offer conflict guard |
| `GET /api/v1/offers` | ✅ | Tenant-scoped list |
| `GET /api/v1/offers/stats` | ✅ | Aggregate by status |
| `GET /api/v1/offers/:id` | ✅ | Full relations |
| `PUT /api/v1/offers/:id` | ✅ | Status lifecycle: PENDING → EXTENDED → ACCEPTED / DECLINED / WITHDRAWN / EXPIRED |
| `DELETE /api/v1/offers/:id` | ✅ | TENANT_ADMIN / SUPER_ADMIN only |

## 1.3 — Commercial Firewall (RBAC)

| Task | Status | Notes |
|------|--------|-------|
| `stripCommercial<T>()` utility | ✅ | Removes `billingRate` + `candidatePayRate` for RECRUITER role |
| `JobsService.findAll()` — role-aware | ✅ | Auto-strips commercial fields |
| `JobsService.findOne()` — role-aware | ✅ | Auto-strips commercial fields |
| Recruiter JD scoping | ✅ | `assignedRecruiterId` auto-filter when role === RECRUITER |

## 1.4 — Submissions Enhancement

| Task | Status | Notes |
|------|--------|-------|
| `PUT /submissions/:id/client-feedback` | ✅ | Sales / TENANT_ADMIN / SUPER_ADMIN only |
| Submission `createdById` + EventEmitter2 | ✅ | Logs activity, emits `submission.created` |

## 1.5 — Analytics (4 New KPIs)

| KPI | Status |
|-----|--------|
| `submissionsTotal` | ✅ |
| `submissionsThisWeek` | ✅ |
| `activeClients` | ✅ |
| `placementsThisMonth` | ✅ |

## 1.6 — Frontend

| Task | Status |
|------|--------|
| `interviewsApi` in api-client.ts | ✅ |
| `offersApi` in api-client.ts | ✅ |
| `submissionsApi.clientFeedback` | ✅ |
| Candidate 360 — Submissions tab | ✅ |
| Dashboard — Role-based KPI grid (RECRUITER / SALES / Admin) | ✅ |
