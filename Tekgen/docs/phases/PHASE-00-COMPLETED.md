# Phase 00 — COMPLETED: Recruitment ATS + AI Screening

**Status:** ✅ DONE  
**Date Completed:** April 2026

---

## What Is Built

### Dashboards
- **Admin Dashboard** — System KPIs (Total JDs, Candidates, Applications, AI Screenings), Clients & JDs accordion, Recruiter Snapshot table, Pipeline donut chart, Stalled JDs panel, Quick action shortcuts
- **Recruiter Dashboard** — Personal KPIs, active JDs with health badges (Good / At Risk / Stalled), follow-up reminders, weekly activity chart

### Job Descriptions (/jobs)
- Create / Edit JDs with Client Name field
- Status: Active / Paused / Filled / Cancelled
- Search, filter by status
- View Details page per JD
- Direct URL refresh (SPA fallback) ✅ fixed

### Candidates (/candidates)
- Candidate 360 page
- Resume upload + text extraction
- Overview, Applications, Screenings tabs
- Applied Jobs tab showing application status
- Direct URL refresh ✅ fixed

### AI Screening
- Screen candidate against a selected JD
- Returns: Score, Recommendation, Strengths, Weaknesses
- Cached result — no duplicate AI calls for same candidate+job pair
- Screening saved against existing candidate (no duplicate candidate created) ✅ fixed
- Screen Now button disabled if no job selected
- Warning shown if no resume text on file
- Application record created on first screening
- Repeat screening does not crash on unique constraint ✅ fixed

### Interviews & Selections
- Interview scheduling
- Selection tracking

### Onboarding
- Onboarding checklist

### Follow-ups (/followups)
- Follow-up reminders per recruiter

### Email Templates
- Reusable email templates

### Authentication / RBAC
- ADMIN and RECRUITER roles
- Role-scoped views (Admin sees all; Recruiter sees own JDs/candidates)
- JWT session authentication

### Infrastructure
- Express serves static Next.js export + all API routes on port 5000
- Ngrok tunnel for team access (persistent static subdomain)
- PostgreSQL via Prisma ORM
- `start.ps1` / `start-ngrok.bat` / `health-check.ps1`

---

## Current Team Credentials

| Name | Email | Role |
|------|-------|------|
| Admin | admin@tekgen.com | ADMIN |
| Shashank | shashank@tekgen.com | RECRUITER |
| Jerry | jerry@tekgen.com | RECRUITER |
| Savitha | savitha@tekgen.com | RECRUITER |
| Demo | demo@tekgen.com | RECRUITER |

---

## Known Gaps (to be addressed in upcoming phases)

- No Employee ID mapped to existing users yet (needed for Phase 01 ESS)
- No global ID search in header
- No My Workspace / ESS pages
- No Sales CRM module
- Candidate ID exists but not shown prominently in all tables
- No audit log visible in UI (backend partial)
