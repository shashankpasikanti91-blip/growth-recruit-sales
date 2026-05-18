# Tekgen AI HRMS — Master Phase-Wise Roadmap

> Single-login internal workforce platform: Recruitment → Sales → HR → Payroll → Finance → Visa → Documents → AI → Analytics

---

## Current Status

| Module | Status |
|--------|--------|
| Recruitment ATS core | ✅ DONE |
| AI Screening | ✅ DONE |
| Candidates, Jobs, Applications | ✅ DONE |
| Admin + Recruiter Dashboards | ✅ DONE |
| My Workspace / ESS | 🟡 Phase 01 — In Progress |
| Sales CRM | 🔲 Phase 02 |
| HR Operations + Malaysia Leave | 🟡 Phase 03 — In Progress |
| Visa & Permits | 🔲 Phase 04 |
| Documents Vault | 🔲 Phase 05 |
| Payroll | 🟡 Phase 06 — In Progress |
| Finance & Invoices | 🟡 Phase 07 — In Progress |
| Workforce Delivery | 🔲 Phase 08 |
| AI Layer | 🔲 Phase 09 |
| Analytics & Reports | 🔲 Phase 10 |
| QA Hardening & Security | 🔲 Phase 11 |

---

## Phase Overview

| Phase | Name | Key Deliverable |
|-------|------|----------------|
| 00 | ✅ Recruitment ATS + AI Screening | Candidates, Jobs, AI Score, Interviews, Selections |
| 01 | My Workspace / ESS | Every user gets personal leave, payslip, attendance, profile under same login |
| 02 | Sales CRM | Clients, Contacts, JDs, Submissions Tracking, Commercials |
| 03 | HR Operations + Malaysia Leave | Employee master, leave balance, state holidays, approval queue |
| 04 | Visa & Permits | Local/expat classification, visa cases, renewals, compliance |
| 05 | Documents Vault | Private storage, owner-ID-linked, expiry tracking, audit log |
| 06 | Payroll | Salary, payroll runs, payslips, statutory (EPF/SOCSO/EIS/PCB), claims |
| 07 | Finance & Invoices | Client invoices, collections, payments, agreements, rate cards |
| 08 | Workforce Delivery | Deployed staff, timesheets, client assignment, billing readiness |
| 09 | AI Layer | Anomaly detection, invoice draft, compliance assistant, document checker |
| 10 | Analytics & Reports | Cross-module KPIs, revenue, headcount, pipeline dashboards |
| 11 | QA Hardening & Security | RBAC regression, audit completeness, production readiness |

---

## Strict Rules (applies to every phase)

- **No wipe code.** Inspect existing routes, DB models, and APIs before making changes.
- **Never break** the existing Recruitment module.
- **ID-first.** Every record must be linked by its unique ID — never by name/email alone.
- **RBAC middleware** must protect every sensitive API on the backend — not just frontend hiding.
- **Payroll and invoice admin** are visible only to Payroll team, Finance, Management, and Super Admin.
- **Recruiters** see only assigned JDs and their own ESS data.
- **All records** must have: `id`, `created_by`, `created_at`, `updated_by`, `updated_at`, `status`, and audit log.
- **AI assists only** — AI must never auto-approve payroll, invoices, leave, visa, or legal documents.
- **Secure documents** — private storage, signed URLs, no public file links, no PII in console logs.
- **Backup compulsory** — run `backup-db.ps1` and keep backup guard checks passing before critical HR/Payroll writes.

---

## Latest Role Hierarchy (May 2026)

- Managing Director (`ADMIN`) — full control across all departments and final approvals.
- Assistant MD (`MANAGEMENT`) — executive approval access and operational oversight.
- Department Managers:
  - Recruitment Manager (`RECRUITMENT_MANAGER`)
  - Sales Manager (`SALES_MANAGER`)
  - HR Ops Manager (`HR_ADMIN`)
  - Payroll Manager (`PAYROLL_ADMIN`)
  - Finance Manager (`FINANCE_HEAD`)
- Recruitment staff (Shashank, Jerry, Savitha) remain as `RECRUITER`.
- Approval rule now standardized:
  - Level 1: Department Manager
  - Level 2: Assistant MD or Managing Director
- Deployed/contractor staff follow ESS-only access (My Workspace only).

---

## Deployment Notes (May 2026)

- Desktop startup scripts are aligned with current quick-login identities and static export build flow.
- HR + Payroll integration is active with hierarchical approvals and backup guard protection.
- Remaining go-live blockers are full test-suite repair, final E2E pass, and production host DNS/TLS cutover.

---

## Detailed Phase Files

| File | Contents |
|------|---------|
| [phases/PHASE-00-COMPLETED.md](phases/PHASE-00-COMPLETED.md) | What is already built |
| [phases/PHASE-01-My-Workspace.md](phases/PHASE-01-My-Workspace.md) | ESS for all internal users |
| [phases/PHASE-02-Sales-CRM.md](phases/PHASE-02-Sales-CRM.md) | Sales CRM full module |
| [phases/PHASE-03-HR-Operations.md](phases/PHASE-03-HR-Operations.md) | HR ops + Malaysia leave/holiday |
| [phases/PHASE-04-Visa-Permits.md](phases/PHASE-04-Visa-Permits.md) | Visa & compliance workflow |
| [phases/PHASE-05-Documents-Vault.md](phases/PHASE-05-Documents-Vault.md) | Secure document vault |
| [phases/PHASE-06-Payroll.md](phases/PHASE-06-Payroll.md) | Payroll module (restricted) |
| [phases/PHASE-07-Finance-Invoices.md](phases/PHASE-07-Finance-Invoices.md) | Finance & invoicing |
| [phases/PHASE-08-Workforce-Delivery.md](phases/PHASE-08-Workforce-Delivery.md) | Deployed staff & timesheets |
| [phases/PHASE-09-AI-Layer.md](phases/PHASE-09-AI-Layer.md) | AI assistants & automation |
| [phases/PHASE-10-Analytics.md](phases/PHASE-10-Analytics.md) | Analytics & reporting |
| [phases/PHASE-11-QA-Security.md](phases/PHASE-11-QA-Security.md) | QA hardening & security |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Global ID structure + role matrix |
