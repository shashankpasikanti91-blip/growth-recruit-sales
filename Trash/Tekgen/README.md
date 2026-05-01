# Tekgen ATS - AI-Powered Recruitment Platform

> Enterprise Applicant Tracking System with RBAC, AI Screening, Analytics and Real-time Monitoring

![Version](https://img.shields.io/badge/version-2.1.0-blue.svg) ![Status](https://img.shields.io/badge/status-live-brightgreen.svg) ![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## Live Access

| URL | Purpose |
|-----|---------|
| https://pawing-phoniness-preamble.ngrok-free.dev | Team URL (persistent static subdomain — same every session) |
| http://localhost:5000 | Desktop / Local URL |

---

## Team Login Credentials

| Name | Email | Password | Role |
|------|-------|----------|------|
| Admin | admin@tekgen.com | Admin@2026 | ADMIN |
| Shashank | shashank@tekgen.com | Shashank@2026 | RECRUITER |
| Jerry | jerry@tekgen.com | Jerry@2026 | RECRUITER |
| Savitha | savitha@tekgen.com | Savitha@2026 | RECRUITER |
| Demo | demo@tekgen.com | Demo@2026 | RECRUITER |

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

    # 1. Apply DB schema (safe, no data loss — only run after schema changes)
    cd tekgen-ats-backend
    npx prisma db push

    # 2. Build frontend (only needed after code changes)
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

## Features

### RBAC
- **ADMIN**: full system control, user management, monitoring dashboard, JD reassignment, integrations
- **RECRUITER**: scoped workspace — own JDs, candidates, follow-ups, AI screenings

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
- RBAC enforced server-side — all admin routes require ADMIN role
- Directory traversal prevention on /uploads
- ngrok interstitial bypass header (`ngrok-skip-browser-warning`)

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
    ├── start-server.bat         ← Desktop: double-click to start (localhost)
    ├── start-ngrok.bat          ← Team: double-click to start (ngrok tunnel)
    ├── start.ps1                ← PowerShell: .\start.ps1 [start|stop|status|logs]
    ├── health-check.ps1         ← .\health-check.ps1 — checks server + ngrok
    ├── ngrok\ngrok-tekgen.yml   ← ngrok tunnel config
    ├── tekgen-ats-backend\      ← Express + Prisma API server
    │   ├── src\index.js         ← Entry point (port 5000)
    │   ├── prisma\schema.prisma ← DB schema
    │   └── .env                 ← Environment variables
    └── tekgen-ats-frontend\     ← Next.js app (built → out\)
        ├── pages\               ← All pages
        ├── components\          ← React components
        └── out\                 ← Static build output (served by Express)
