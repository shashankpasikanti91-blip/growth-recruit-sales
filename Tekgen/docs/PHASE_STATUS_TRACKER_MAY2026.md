# Tekgen Phase Status Tracker (May 2026)

## Pilot program closure (May 2026)

This document records **internal pilot completion**: HRMS, payroll, recruitment delivery, approvals, visa ops, finance invoicing, and workforce pipeline are **accepted for pilot production** subject to **signed UAT below** and normal change management afterward.

**Delivered for pilot**

- **RBAC + navigation:** Role-based sidebar (Executive Pending for MD / Assistant MD), Operations Hub, module grouping; demo accounts in `shared/demoWorkspaceAccounts.js`.
- **Approvals:** L1 department manager → L2 MD/management/assistant MD (`approvalService`); deployed staff client L1 + Tekgen L2; executive queue aligned with backend HRMS roles.
- **Payroll (Phase 06):** Completed scope — runs, structures, claims, bank templates, statutory automation, backup guard, signed payslip downloads.
- **Workforce delivery:** JD dates, submission pipeline (`/api/submissions`), in-app notifications; bulk hiring Excel with JR / hiring-request refs.
- **Visa:** TKG-VISA workflow, queues, compliance hooks.
- **Security / polish (pilot bar):** ESS **My Documents** and **Statutory Forms** open files via authenticated routes (`GET /api/my/documents/:id/download`, `GET /api/my/statutory-forms/:id/download`) with JWT, instead of raw `/uploads` links. Cross-cutting authenticated downloads also cover leave/claim attachments (`GET /api/secure-files/attachments/:id/download`), client portfolio docs (`…/client-documents/:id/download`), vault-stored agreement PDFs (`…/client-agreements/:id/download`), visa case docs (`GET /api/visa/cases/:caseRef/documents/:docId/download`), and HR employee documents (`GET /api/hrms/employees/:id/documents/:docId/download`). Optional email when submission stages change: `SUBMISSION_PIPELINE_EMAIL_NOTIFY=true` plus SMTP (`SMTP_*`, `FRONTEND_URL`).
- **Regression:** `npm run test:e2e:all` in `tekgen-ats-backend` (API must be running).

**Explicitly out of scope for this pilot (future phases)**

- **Phase 02 — Full Sales CRM:** Deferred; current sales/client/job/submission flows remain.
- **Phase 09 — AI layer:** Deferred beyond pilot; partial/design-only items stay documented per phase files.
- **Phase 10 — Cross-module analytics:** Deferred; baseline ATS analytics remains.

**Continuous improvement (post-pilot backlog, not blocking sign-off)**

- Stricter configurable leave rules and HR policy modules.
- Finance dashboard depth and tighter client-ownership scoping on reports.
- Bulk “client submit pack” automation and SLA nudges.
- Restrict raw `/uploads` at the reverse proxy once all surfaces use authenticated downloads (ESS routes above are the pattern).

---

## UAT sign-off (fill for records)

| Area | Evidence / notes | Owner | Sign-off | Date |
|------|------------------|-------|----------|------|
| Leave / claim / OT approvals (internal + deployed) | Scenario walkthrough + executive queue | | ☐ | |
| Payroll run → payslip → employee view | `npm run test:e2e:all` + spot-check UI | | ☐ | |
| Workforce submissions pipeline | Stage change + notifications (+ email if `SUBMISSION_PIPELINE_EMAIL_NOTIFY=true`) | | ☐ | |
| Visa case lifecycle | Create/update case, documents | | ☐ | |
| Finance invoice flow | Create / approve / notify | | ☐ | |
| ESS documents / statutory forms | **View** on My Documents / Statutory Forms (auth download) | | ☐ | |
| RBAC spot-check | Login as RECRUITER, SALES_MANAGER, PAYROLL_ADMIN, MD | | ☐ | |

---

## Current Phase State (pilot perspective)

| Phase | Module | Pilot status | Scope accepted | Post-pilot backlog (optional) |
|------|--------|--------------|----------------|------------------------------|
| 01 | My Workspace / ESS | **Pilot closed** | Profile, leave, claims, payslips, documents, statutory forms | Further UX polish |
| 02 | Sales CRM | **Deferred** | Legacy + current sales/client/job UX | Full CRM phase when scheduled |
| 03 | HR Operations | **Pilot closed** | Approvals, HR master data, attendance, holidays, onboarding/offboarding, CSV import | Performance/policy modules, stricter leave rules |
| 04 | Visa & Permits | **Pilot closed** | TKG-VISA module, queues, renewals | Extra audit coverage, edge-case UAT |
| 05 | Documents Vault | **Pilot closed** | ESS-linked docs + authenticated download API | Gateway hardening for `/uploads` |
| 06 | Payroll | **Completed** | Full Phase 06 closure checklist | — |
| 07 | Finance & Invoices | **Pilot closed** | Invoices, agreements, collections APIs + smoke | Deeper dashboards/reports |
| 08 | Workforce Delivery | **Pilot closed** | JD dates, pipeline, notifications, bulk hiring import | Bulk submit pack, SLA automation |
| 09 | AI Layer | **Deferred** | Partial / design only | Full AI phase |
| 10 | Analytics | **Deferred** | Baseline ATS analytics | Cross-module analytics |
| 11 | QA + Security | **Pilot baseline met** | JWT auth, RBAC, rate limits, sanitization, backup guard, E2E suite | External pen-test / prod policy |

---

## Finalized Role Structure

- Managing Director: `ADMIN`
- Assistant MD / Assistant Manager: `MANAGEMENT`
- Recruitment Manager: `RECRUITMENT_MANAGER`
- Sales Manager: `SALES_MANAGER`
- HR Ops Manager: `HR_ADMIN`
- Payroll Manager: `PAYROLL_ADMIN`
- Finance Manager: `FINANCE_HEAD`
- Recruitment Staff (unchanged): `RECRUITER` (Shashank, Jerry, Savitha)

---

## Approval Rule (Active)

- Level 1: Department Manager
- Level 2: Assistant MD or Managing Director

Applied to leave, claims, overtime, and payroll final approval flow mapping.

---

## Payroll Cycle + Statutory Rule (Malaysia)

- Monthly payroll processing cycle: `25th current month -> 24th next month`
- Monthly statutory run: EPF, SOCSO, EIS, PCB are computed and submitted in monthly payroll cycle.
- Yearly statutory pack: annual employee tax summary documents (e.g., EA form style output) generated after year-end close.

---

## Department Permission Scope (Operational)

- Default hierarchy for all departments: first-level approval by Department Head, second-level approval by MD/Director/Executive Head.
- If a request is raised by Department Head level, it skips level-1 and goes directly to MD/Director/Executive Head.
- Recruitment: operational approvals mainly for leave, attendance, and claims for recruitment team members.
- Sales (currently hold): same base approval model; only leave/attendance/claims active now.
- Outside/Deployed staff: leave/attendance/claims require client-side confirmation where applicable, then Tekgen Department Head, then MD/Director final approval.
- HR/Payroll actions that affect salary or compliance require the same 2-level hierarchy before final posting/publishing.
- Decision propagation is now explicit: approve/reject updates send status notifications back to requester + department managers for leave/claim/payroll flows.
- Attendance review updates (recorded/updated/deleted by authorized HR/Payroll users) now notify affected employees.
- Onboarding/offboarding status changes now notify affected employees directly from HR operations actions.
- Visa case permit-status updates now notify affected employee (if linked) and department management visibility group.
- Finance invoice approve/reject actions now notify the invoice creator for immediate follow-up and processing.

---

## Leadership Monitoring Rule (MD/Head)

- MD/Director/Executive Head must have cross-department monitoring visibility.
- Monitoring includes pending approvals, status progression, and operational bottlenecks by department.
- Payroll monitoring includes run status, approval queue, exceptions, and completion state.
- Leadership dashboard is the final escalation and governance view across HR, payroll, and department workflows.

---

## Payroll Completion Upgrades (Latest)

- HR Ops visibility is enabled for Payroll Staff & Attendance operations, while payroll locking remains enforced after final run states.
- Attendance records are now protected from changes once payroll run status reaches approved/generated/published/closed for that payroll bucket.
- Statutory Contributions now includes EA form generation workflow by year and statutory form status tracking.
- Payroll settings support versioned rate configuration (`effectiveDate`, worker category, residency) for government percentage updates.
- Payroll validation now reads effective statutory settings instead of fixed percentages to reduce hardcoded compliance risk.
- Payroll run operations now include explicit `Generate Payslips`, `Publish`, and `Bank Transfer File` export actions.
- Payroll dashboard duplicate quick-actions panel is removed; operational navigation stays in Sidebar only.
- Operations Hub payroll KPI mapping now reads live backend counts (pending runs and claims) instead of static placeholders.
- Payroll integrity E2E now verifies per-payslip deduction and net-salary calculations against recomputed values.
- Payroll generation now isolates per-employee failures so one bad employee record does not block everyone else.
- Leadership monitoring endpoint is resilient with partial-data fallback if one approval source temporarily fails.
- Attendance write/delete is now gated by compulsory recent-backup validation (same as other critical payroll writes).

---

## Deployment Readiness (Current)

- Startup shortcuts updated to use current quick-login accounts and reliable frontend static export flow.
- Compulsory backup guard is active for critical HR/Payroll writes.
- Quick-login smoke checks passed for all shared demo accounts.
- Manager/team-lead dashboard visibility tightened (Operations Hub only for MD and Assistant MD).

---

## E2E Validation Sweep (Latest)

**Canonical commands** (from `tekgen-ats-backend/package.json`):

- `npm run test:e2e:all` — full backend API regression in one command: `test:e2e:unified` → `test:e2e:finance` → `test:e2e:payroll-integrity` (API must be up on `localhost:5000` by default, or set `API_BASE`).
- `npm run test:e2e:unified` — orchestrates role-matrix → department-approvals (align) → full lifecycle.
- `npm run test:e2e:role-matrix` — cross-department RBAC, HRMS KPIs (including `recruitmentDelivery` + `sales` pulse), **submissions list** smoke (`GET /api/submissions?jobId=`), payroll isolation.
- `npm run test:e2e:payroll-integrity` — payslip math and role isolation.
- `npm run test:e2e:finance` — finance dashboard smoke.
- `npm run test:e2e:full-lifecycle` — leave/payroll lifecycle (dedicated accounts).
- `node test-e2e.js` — forwards to `test:e2e:unified` (back-compat only).

Multi-iteration role-matrix validation targets `ADMIN`, `PAYROLL_ADMIN`, `HR_ADMIN`, `FINANCE_HEAD`, `SALES_MANAGER`, `RECRUITER`, and `VISA_ADMIN`. Sensitive payroll routes remain blocked for non-payroll roles.

## Dev server / fresh database (May 2026)

- **Start API:** `npm run dev` or `npm start` in `tekgen-ats-backend` (requires `DATABASE_URL`, `JWT_SECRET`, etc.).
- **Full reset (destructive):** `npm run prisma:reset` in backend, then restart the server — demo accounts re-seed from `shared/demoWorkspaceAccounts.js` on boot when seed path is active in `src/index.js`.
- **Frontend:** `npm run dev` in `tekgen-ats-frontend` with `NEXT_PUBLIC_API_URL` (or your env) pointing at the API.

## Workforce delivery — submission pipeline (Latest)

- **API:** `GET /api/submissions?jobId=<jobId>` (delivery roles), `PATCH /api/submissions/:id/stage` with `{ "stage": "SUBMITTED_TO_CLIENT", ... }` — stages align with Prisma `SubmissionStage`.
- **Notifications:** On stage change, in-app notifications go to assigned recruiters, JD owner, sales owner, submission recruiter, and client account owner (excluding the actor).
- **Optional email:** Set `SUBMISSION_PIPELINE_EMAIL_NOTIFY=true` and SMTP env vars; emails mirror the same stakeholder set (failures are logged, non-blocking).
- **UI:** Sales dashboard “Recent Submissions” stage dropdown; Job detail page “Candidate pipeline” table with the same control for recruiters.
- **Bulk client hiring Excel (CIMB-style):** `POST /api/jobs/bulk-hiring-request/preview` + `commit` — parses **Hiring Request ID**, **JR No**, **Position**, duration, location, competencies, responsibilities, spec, billing rate; optional per-row recruiter assignment; jobs store `clientJrNumber`, `clientRequestUuid`, `bulkImportBatchId`. Monitoring: **Operations Hub** lists recent batches; **Job Openings** filter `?batch=`; **Sales → Client requirements** shows JR / HR ID columns.

---

## Phase 06 Closure Checklist

- Secure payslip signed URL download implemented in payroll employee routes.
- Advanced bank transfer templates delivered for STANDARD/MAYBANK/CIMB outputs.
- Statutory filing automation delivered for monthly batch generation + yearly readiness status.
- Final role coverage validated with E2E role-matrix and payroll-integrity suites (or full sweep via `npm run test:e2e:all`).
