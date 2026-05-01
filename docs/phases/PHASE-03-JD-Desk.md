# Phase 03 — SRP JD Desk: Sales-to-Recruiter Handoff

**Status:** ✅ DONE  
**Goal:** Make the JD page the clean handoff point. Sales assigns recruiters; Recruiters see filtered JDs; both track submission status from the JD.

---

## 3.1 — Recruiter Assignment

| Task | Status | Notes |
|------|--------|-------|
| "Assign Recruiter" button on JD 360 | ✅ | Sales / TENANT_ADMIN / SUPER_ADMIN only |
| Searchable user dropdown (RECRUITER role) | ✅ | Fetches from `GET /team/recruiters` |
| `PUT /jobs/:id` sets `assignedRecruiterId` | ✅ | |
| Display assigned recruiter on JD 360 header | ✅ | Name + Change / Unassign action |
| `GET /team/recruiters` backend endpoint | ✅ | Returns active RECRUITERs |

## 3.2 — Lead → Client Conversion

| Task | Status |
|------|--------|
| "Convert to Client" button on Lead 360 | ✅ |
| Pre-fill Client form from Lead/Company data | ✅ |
| Sets `lead.convertedToClientId` + `lead.convertedAt` | ✅ |
| Sets `company.isClient = true`, `company.clientId` | ✅ |
| Redirect to new Client 360 after conversion | ✅ |

## 3.3 — Lead 360: ICP Score Explanation

| Task | Status |
|------|--------|
| Score breakdown panel (Company Fit, Title Fit, Industry, Country, Engagement) | ✅ |
| Recommended action text based on score bucket | ✅ |

## 3.4 — Proposal 360

| Task | Status |
|------|--------|
| `/proposals/:id` detail page | ✅ |
| Status progression UI (visual step bar) | ✅ |
| Link to client + link to lead | ✅ |
| Document URL link | ✅ |
