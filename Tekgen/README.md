# Tekgen ATS - AI-Powered Recruitment Platform

> Enterprise Applicant Tracking System with RBAC, AI Screening, Analytics and Real-time Monitoring

![Version](https://img.shields.io/badge/version-2.1.0-blue.svg) ![Status](https://img.shields.io/badge/status-live-brightgreen.svg) ![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## Live Access

| URL | Purpose |
|-----|---------|
| https://pawing-phoniness-preamble.ngrok-free.dev | Example team URL (yours follows your ngrok account / reserved domain) |
| http://localhost:5000 | Same app on this machine (API + static UI on one port) |

### Desktop shortcuts (recommended)

| Shortcut target | What it does |
|-----------------|----------------|
| `C:\Tekgen\start-server.bat` | Starts Docker DB, migrates, starts Node on **5000**, opens **http://localhost:5000** in your browser — **local / desktop** use. |
| `C:\Tekgen\start-ngrok.bat` | Same stack plus **ngrok**; resolves the **HTTPS public URL**, saves it to `ngrok\last-public-url.txt`, and **opens that live URL** for **team** access. |

Create `.lnk` files on the Desktop that point to those two `.bat` files (right‑click → Send to → Desktop, or New Shortcut → Browse). Double‑clicking runs the server from the right folder and opens the correct browser entry point.

**Note:** The team URL can change unless you use a **reserved ngrok domain** in your ngrok config. After each `start-ngrok.bat` run, the latest URL is in `ngrok\last-public-url.txt`.

---

## Sign-in (production and team access)

Use the **email and password issued to you** (shared individually by your admin — not via the repo or a shared picker on the login page).

**Local development only:** demo users and passwords used for API startup seeding live in `shared/demoWorkspaceAccounts.js`. After pulling changes, restart the API so seeded passwords stay in sync with that file. **Roles and names are not changed** for existing users (so DB restores and promotions are safe). Set `SEED_UPDATE_DEMO_ROLES=true` only if you intentionally want to reset demo roles from that file.

### Current approval hierarchy

- Level 1: Department Manager
- Level 2: Assistant MD or Managing Director

---

## Architecture

Single-server: Express serves static Next.js export + all API routes on port 5000. Ngrok tunnels port 5000 to a persistent public HTTPS URL.

---

## Quick Start

### Desktop Server (localhost only)

Double-click **`start-server.bat`** — or run in PowerShell:

    .\start.ps1

This skips frontend rebuild if already built, starts the backend, and opens your browser automatically.

### Team Server (share with team via ngrok)

Double-click **`start-ngrok.bat`** — it:
1. Starts the backend on port 5000
2. Starts the ngrok tunnel
3. Prints the public URL to share with your team

### Manual Start

    # 0. (Strongly recommended) Database backup before schema changes or risky operations
    powershell -File C:\Tekgen\backup-db.ps1

    # 1. Database schema (production / shared DB — prefer migrate deploy; NEVER migrate reset here)
    cd tekgen-ats-backend
    npx prisma migrate deploy
    # Dev-only alternative: npx prisma db push — never use --force-reset or --accept-data-loss on team data

    # 2. Build frontend (does NOT touch PostgreSQL — safe for recruitment while others use the app)
    #    Required whenever UI changes: Express serves tekgen-ats-frontend\out — skipping this shows an "old" UI.
    cd tekgen-ats-frontend
    npm run build

    # 3. Start backend
    cd tekgen-ats-backend
    node src/index.js

    # 4. (Optional) Start ngrok for team access
    .\ngrok\ngrok.exe start --config .\ngrok\ngrok-tekgen.yml tekgen

### Health Check

    .\health-check.ps1

---

## Database backup (mandatory for production data)

Run **`backup-db.ps1`** before migrations, restores, or bulk data work. It writes timestamped dumps under `backups\` and prunes older files (see script header). Schedule it in Task Scheduler for unattended safety.

---

## Phase status (completed vs pending)

Single source of truth: **`docs/PHASE_STATUS_TRACKER_MAY2026.md`**. High-level roadmap: **`docs/ROADMAP.md`**. Older session notes and verification logs live under **`docs/archive/`**.

---

## Features

### RBAC
- **ADMIN**: full system control, user management, monitoring dashboard, JD reassignment, integrations
- **RECRUITER**: shared recruitment pipeline (jobs and candidates lists are team-wide); personal notifications, integrations, and some screening session views remain per-user where noted in the app

### Admin Dashboard (/)
- System KPIs: Total JDs, Candidates, Applications, AI Screenings
- **Clients & JDs accordion**: grouped by client, expandable — shows JD ID, Title, Recruiter, Status, CV count, Pipeline breakdown, View link
- Recruiter Snapshot table: active JDs, CVs, screenings, pending follow-ups per recruiter
- Pipeline donut chart
- Stalled JDs panel (conditional)
- Quick action shortcuts

### Recruiter Dashboard (/)
- Personal KPIs, active JDs with health badges (Good / At Risk / Stalled)
- Follow-up reminders, weekly activity chart

### Job Descriptions (/jobs)
- Create / Edit JDs with **Client Name** field
- Status: Active / Paused / Filled / Cancelled
- Responsive job cards (2-col mobile, 4-col desktop)
- Search, filter by status

### Follow-ups (/followups)
- 4-bucket: Overdue / Due Today / Upcoming / Done
- Click any card to expand inline edit panel
- Linked JD dropdown, mark-done, delete

### Admin Monitoring (/admin/monitoring)
- **3 tabs**: Recruiter Workload | Clients & JDs | Stalled JDs
- Clients & JDs tab: accordion by client, expandable JD table with full details
- Global search across all tabs

### Admin Users (/admin)
- User table: Name, Email, Role, Active JDs, CVs, Screenings, Follow-ups, Status
- One-click role toggle, activate/deactivate

### Analytics (/analytics)
- 4 tabs: Overview, Recruiter Performance, Pipeline Trends, SLA & Timelines

### AI Screening (/screening)
- GPT-4.1-mini resume analysis, match score 0–100, skill gap analysis, recommendation

### Notifications
- Real-time bell with unread badge, mark-read, dismiss, mark-all-read

### Integrations (/integrations)
- Webhook and API integration management

---

## Security

- JWT HS256, 7-day expiry, verified server-side on every protected route
- Helmet (CSP, HSTS, XFO), HPP, rate limiting, request sanitization (XSS)
- RBAC enforced server-side — privileged routes require the correct role; staff-facing “my workspace” APIs are scoped to the authenticated user so one employee cannot enumerate another’s private HR/payroll data through the app
- Directory traversal prevention on /uploads
- ngrok interstitial bypass header (`ngrok-skip-browser-warning`)
- Store ngrok auth tokens only in **`ngrok/ngrok-tekgen.local.yml`** (gitignored); never commit tokens or production secrets

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (pages router, static export), React 18, Tailwind CSS 3.3.6, Recharts 2.10.0 |
| Backend | Node.js 20, Express 4, Prisma 5.22.0 |
| Database | PostgreSQL |
| AI | OpenRouter (GPT-4.1-mini) |
| Auth | JWT HS256, bcryptjs |
| Tunnel | ngrok (static subdomain) |
| Icons | Lucide React 0.294.0 |

---

## File Structure

    c:\Tekgen\
    ├── backup-db.ps1            ← **Run before risky DB work** — dumps to backups\
    ├── start-server.bat         ← Desktop: double-click to start (localhost)
    ├── start-ngrok.bat          ← Team: double-click to start (ngrok tunnel)
    ├── start.ps1                ← PowerShell: .\start.ps1 [start|stop|status|logs]
    ├── health-check.ps1         ← .\health-check.ps1 — checks server + ngrok
    ├── docs\                    ← Architecture, roadmap, phase tracker, archive\
    ├── ngrok\ngrok-tekgen.yml   ← ngrok tunnel config (use .local.yml for secrets)
    ├── tekgen-ats-backend\      ← Express + Prisma API server
    │   ├── src\index.js         ← Entry point (port 5000)
    │   ├── prisma\schema.prisma ← DB schema
    │   └── .env                 ← Environment variables
    └── tekgen-ats-frontend\     ← Next.js app (built → out\)
        ├── pages\               ← All pages
        ├── components\          ← React components
        └── out\                 ← Static build output (served by Express)
