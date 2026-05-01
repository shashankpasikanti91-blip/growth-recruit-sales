# Phase 07 — SRP My Hub: Team Productivity Layer

**Status:** ✅ DONE  
**Priority:** MEDIUM — After core Sales + Recruitment workflow is stable  
**Depends on:** Phase 01, Phase 02 (so JD and Lead ownership is established)

---

## Goal

Every logged-in user on SRP AI Growth gets a personal **My Hub** — a private space showing only their own work, pipeline, and actions. This replaces manual checking across tables to see "what do I have to do today?"

> **Important:** My Hub is **NOT** an HR self-service (no leave, payslips, attendance — that is Tekgen's domain). My Hub is a **Recruitment + Sales productivity layer** that surfaces each team member's personal workload.

---

## Why It's Different From a Generic Dashboard

The main Dashboard shows company-wide metrics (admin view).  
**My Hub shows only MY work** — what is assigned to me, what I submitted, what I need to action.

| Feature | Main Dashboard | My Hub |
|---------|---------------|--------|
| Scope | All users / all data | My data only |
| KPIs | Company-wide | My personal pipeline |
| JDs shown | All open JDs | Only JDs assigned to me |
| Leads shown | All leads | Only leads assigned to me |
| Follow-ups | All | Only my pending |
| Audience | Admins + Managers | All users |

---

## Role-Based Experience

| Role | My Hub Shows |
|------|-------------|
| **Recruiter** | My Assigned JDs · My Screened Today · My Submissions · My Candidates · My Activity |
| **Sales Rep** | My Leads Pipeline · My Follow-ups Due · My Clients · My Proposals · My Activity |
| **Sales Manager** | My Leads + Team Pipeline overview · My Follow-ups · My Clients |
| **Recruitment Manager** | My Assigned JDs + Team JD overview · My Submissions tracker |
| **Tenant Admin** | Company-level performance + own metrics |

---

## Pages to Build

### 8.1 — `/my-hub` — My Dashboard (Landing)

Personal productivity view. Role-aware: different cards shown based on role.

#### For Recruiters:
| Card | Content |
|------|---------|
| My Active JDs | Count + list of JDs assigned to me (Open stage) |
| Screened Today | Candidates AI-screened by me today |
| My Submissions This Month | Count + accepted/rejected/pending |
| My Top Candidates | Candidates with highest AI score on my JDs |
| Pending Actions | Submissions awaiting my follow-up |

#### For Sales Reps:
| Card | Content |
|------|---------|
| My Leads in Pipeline | Count by stage (New / Qualified / Nurturing / Converted) |
| Follow-ups Due Today | Overdue + today's scheduled |
| My Active Clients | Count |
| My Open Proposals | Count + value |
| My Conversions This Month | Leads → Clients this month |

---

### 8.2 — `/my-hub/profile` — My Profile

Personal info and preferences.

| Field | Editable By User |
|-------|-----------------|
| First Name / Last Name | ✅ |
| Display Photo / Avatar | ✅ |
| Phone / Mobile | ✅ |
| Timezone | ✅ |
| Email Signature (for outreach emails) | ✅ |
| Notification Preferences | ✅ |
| LinkedIn Profile URL | ✅ |
| Connected Email Account (Gmail / Outlook OAuth) | ✅ — Phase 08 |
| Role | ❌ Admin only |
| Tenant | ❌ Read-only |

**ID:** Users get a `SRP-USR-XXXX` display ID (already `businessId` on `User` model).

---

### 8.3 — `/my-hub/my-jds` — My Assigned JDs *(Recruiter / Recruitment Manager)*

| Column | Display |
|--------|---------|
| JD ID | SRP-JD-XXXX |
| Job Title | |
| Client | Client name |
| Stage | Open / Hold / Closed |
| Assigned Date | Dual-format |
| My Screened | Count candidates I AI-screened for this JD |
| My Submitted | Count submissions I raised |
| Action | → JD 360 |

**Filter:** My JDs only (`job.assignedRecruiterId = me`, or multi-assign from Phase 02)  
**Data:** From `Job` table joined to my `User.id`

---

### 8.4 — `/my-hub/my-submissions` — My Submissions *(Recruiter)*

| Column | Display |
|--------|---------|
| Sub ID | SRP-SUB-XXXX |
| Candidate | Name + link |
| JD | Title + link |
| Client | Name |
| Stage | Stage badge |
| Submitted On | Dual-format |
| Last Update | |
| Client Feedback | Summary (if entered by Sales) |

**Data:** `Submission` table where `recruiterId = me`

---

### 8.5 — `/my-hub/my-leads` — My Leads Pipeline *(Sales Rep / Sales Manager)*

| Column | Display |
|--------|---------|
| Lead ID | SRP-LD-XXXX |
| Company | |
| Contact | Primary contact name |
| ICP Score | Score badge |
| Stage | Stage pill |
| Last Contacted | Dual-format |
| Next Follow-up | Dual-format |
| Action | → Lead 360 |

**Filter:** `lead.assignedToId = me`  
**Kanban view toggle option** (drag by stage)

---

### 8.6 — `/my-hub/my-follow-ups` — My Follow-ups *(Sales Rep / Recruiter)*

| View | What it shows |
|------|--------------|
| Today | Follow-ups due today |
| Overdue | Past due, not completed |
| This Week | All this week's follow-ups |
| Completed | Done in last 30 days |

**Data:** `FollowUp` table where `assignedToId = me` (add field if not there)

---

### 8.7 — `/my-hub/my-activity` — My Activity Feed

Timeline of all actions I took across the platform:
- Screened candidate X against JD Y → score Z
- Submitted Candidate X to Client Y for JD Z
- Created new Lead: Company ABC
- Converted Lead → Client
- Added Follow-up for Lead
- Sent outreach to candidate
- Updated submission stage to Interview

**Data:** `AuditLog` table where `userId = me`, most recent 100 entries

---

## DB Changes Required

No new models needed. Use existing tables with user filters:

| Table | Filter |
|-------|--------|
| `jobs` | `assignedRecruiterId = me` OR join on multi-assign table (Phase 02) |
| `submissions` | `recruiterId = me` |
| `leads` | `assignedToId = me` |
| `follow_ups` | `assignedToId = me` — **add `assignedToId` if missing** |
| `users` | `id = me` — for profile |
| `audit_logs` | `userId = me` |

**Check `FollowUp` model** — if no `assignedToId`, add it in Phase 08 migration.

---

## API Endpoints Required

All prefixed with `/api/v1/my/`:

```
GET  /api/v1/my/profile                    — own user profile
PUT  /api/v1/my/profile                    — update own profile
GET  /api/v1/my/dashboard                  — role-aware KPI cards
GET  /api/v1/my/jds                        — my assigned JDs (recruiter)
GET  /api/v1/my/submissions                — my submissions (recruiter)
GET  /api/v1/my/leads                      — my assigned leads (sales)
GET  /api/v1/my/follow-ups                 — my follow-ups (all roles)
GET  /api/v1/my/activity                   — my audit log feed (last 100)
```

---

## Sidebar Addition

Add a **My Hub** group at the TOP of the sidebar (above Sales CRM), visible to ALL logged-in users:

```
▼ My Hub
   My Dashboard        /my-hub
   My Profile          /my-hub/profile
   My JDs              /my-hub/my-jds          (Recruiter / Rec. Manager only)
   My Submissions      /my-hub/my-submissions  (Recruiter only)
   My Leads            /my-hub/my-leads        (Sales only)
   My Follow-ups       /my-hub/my-follow-ups   (Sales + Recruiter)
   My Activity         /my-hub/my-activity     (All)
```

Items shown/hidden based on role.

---

## Access Rules

| Rule | Detail |
|------|--------|
| Every user sees only their own data | Enforced at API level: `userId = req.user.id` |
| Admins cannot access other users' My Hub | Not a management tool — use Users & Roles for that |
| No salary, billing, or rate fields in My Hub | Those remain in commercial-restricted views |
| Profile updates audit-logged | `UPDATE_USER_PROFILE` in `audit_logs` |

---

## Build Order

1. `GET /api/v1/my/profile` + `PUT` — quick win, uses existing `User` model
2. `/my-hub/profile` page
3. `GET /api/v1/my/dashboard` — role-aware KPI aggregator
4. `/my-hub` dashboard page with role-aware cards
5. `GET /api/v1/my/jds` + `/my-hub/my-jds` — Recruiter JD list
6. `GET /api/v1/my/submissions` + `/my-hub/my-submissions`
7. `GET /api/v1/my/leads` + `/my-hub/my-leads`
8. `GET /api/v1/my/follow-ups` + `/my-hub/my-follow-ups`
9. `GET /api/v1/my/activity` + `/my-hub/my-activity`

---

## ID Reference

| Entity | Display ID Format |
|--------|------------------|
| User / Team Member | SRP-USR-XXXX |
| Job (JD) | SRP-JD-XXXX |
| Submission | SRP-SUB-XXXX |
| Lead | SRP-LD-XXXX |
| Follow-up | SRP-FU-XXXX |
| Audit event | (no display ID — internal only) |
