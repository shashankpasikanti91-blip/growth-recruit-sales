# Phase 04 — SRP Candidate 360: Status Lifecycle & Onboarding

**Status:** ✅ DONE  
**Goal:** Complete the candidate journey from sourced to joined. 19-status lifecycle engine + post-offer onboarding checklist.

---

## 4.1 — 19-Status Lifecycle Engine

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
| OFFER_DECLINED | Candidate declined |
| JOINED | Candidate started |
| ON_HOLD | Paused |
| REJECTED | Did not pass |
| WITHDRAWN | Candidate dropped out |

| Task | Status |
|------|--------|
| Status machine with valid transitions (server-side) | ✅ |
| `CandidateStatusHistory` log table | ✅ |
| Status timeline on Candidate 360 | ✅ |

## 4.2 — Onboarding Checklist (Post-Offer)

| Task | Status | Notes |
|------|--------|-------|
| Onboarding checklist tab on Candidate 360 | ✅ | After OFFER_ACCEPTED |
| Document items: Passport, Visa, Offer Letter, Contract, Bank Details | ✅ | |
| Verification status: Uploaded / Verified / Missing | ✅ | |
| Joining date: Expected vs Actual | ✅ | |
| Onboarding completion % bar | ✅ | |
