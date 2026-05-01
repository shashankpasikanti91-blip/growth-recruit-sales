# Phase 02 — SRP Placement Desk: Full Submission & Interview UI

**Status:** ✅ DONE  
**Goal:** Complete the visual placement desk. Give every role a full UI for the submission → interview → offer lifecycle.

---

## 2.1 — Interviews Full Page (`/interviews`)

| Task | Status | Notes |
|------|--------|-------|
| `/interviews` list page | ✅ | Table: candidate, job, client, round, mode, scheduledAt, status, result |
| Status badge (color-coded) | ✅ | SCHEDULED=blue, COMPLETED=green, CANCELLED=red, NO_SHOW=orange |
| Schedule interview modal | ✅ | Date, time, mode, meeting link, round |
| Edit / reschedule modal | ✅ | Update status/result/rating/feedback |
| Feedback entry form | ✅ | Rating (1-5 stars), result (PASS/FAIL/HOLD), notes |
| Filter: by status / date | ✅ | Status filter tabs + stats cards |

## 2.2 — Offers Full Page (`/offers`)

| Task | Status | Notes |
|------|--------|-------|
| `/offers` list page | ✅ | Table: candidate, job, client, salary, currency, status, dates |
| Status action buttons | ✅ | PENDING→EXTENDED→ACCEPTED/DECLINED/WITHDRAWN via TRANSITIONS map |
| Decline reason capture modal | ✅ | Free text reason |
| Filter: by status / client | ✅ | Status stat cards + filter bar |

## 2.3 — JD 360 — Submissions Tab

| Task | Status |
|------|--------|
| Submissions tab on JD 360 | ✅ |
| Submission row: candidate, stage badge, submitted date | ✅ |
| Client feedback column | ✅ |
| "Enter Feedback" inline action | ✅ |

## 2.4 — Client 360 — Tabs

| Tab | Status |
|-----|--------|
| Contacts | ✅ |
| Documents | ✅ |
| KPI Cards (6: JDs / CVs / Submissions / Interviews / Offers / Follow-ups) | ✅ |

## 2.5 — Submissions Pipeline: Kanban Board

| Task | Status |
|------|--------|
| Kanban board on `/submissions` (10 columns) | ✅ |
| Inline stage update per card | ✅ |
| Card: candidate, job, client, AI match score | ✅ |
