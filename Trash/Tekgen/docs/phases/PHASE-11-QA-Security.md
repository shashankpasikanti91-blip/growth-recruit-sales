# Phase 11 — QA Hardening & Security

**Status:** 🔲 Not Started  
**Timing:** Final phase — run after all modules are implemented

---

## Goal

Ensure the platform is production-ready:  
- RBAC works correctly end-to-end  
- Sensitive data is protected  
- All user-facing actions have proper states (loading / empty / error / success)  
- Audit logs are complete and reliable  
- No security vulnerabilities from OWASP Top 10

---

## Security Checklist

### Authentication & Authorization
- [ ] JWT tokens are short-lived and refreshed properly
- [ ] Session invalidation works on logout
- [ ] Role-based middleware enforced on **every API endpoint** (not just frontend hiding)
- [ ] Tenant isolation enforced — no user can access another company's data
- [ ] Payroll admin APIs return 403 to Recruiters, Sales, and normal HR
- [ ] Finance APIs return 403 to Recruiters
- [ ] Employee ESS APIs return only that user's own data (verified by `req.user.id`)

### Input Validation
- [ ] All API inputs validated server-side (not just frontend)
- [ ] No SQL injection via Prisma safe queries
- [ ] No XSS — all user-input sanitized before rendering
- [ ] File upload: type validation (PDF/JPG/PNG/DOCX only), size limit enforced server-side
- [ ] IDs validated as proper format before DB queries

### Sensitive Data
- [ ] No salary amounts, tax numbers, bank details, passport numbers in server logs
- [ ] No permanent public URLs for any uploaded documents
- [ ] Signed URLs for document downloads expire within 15–30 minutes
- [ ] Payslip PDFs never stored at a guessable URL
- [ ] No hardcoded secrets, API keys, or database credentials in code
- [ ] All `.env` values validated at startup

### Audit Logs
- [ ] Every create / update / delete / view / download / approve / reject action is audit-logged
- [ ] Audit logs store: entity ID, entity type, action, actor user ID, timestamp, old value (where applicable)
- [ ] Destructive actions (delete, terminate employee, cancel invoice, lock payroll) require confirmation + reason
- [ ] Audit logs are **append-only** — no one can delete audit log entries

### Error Handling
- [ ] All API errors return safe messages — no stack traces, DB details, file paths, or secrets exposed to users
- [ ] All pages have loading state (skeleton / spinner)
- [ ] All pages have empty state (no data message + CTA)
- [ ] All pages have error state (retry option)
- [ ] All forms show validation errors inline (not just toast)

---

## RBAC Regression Test Matrix

| Test | Expected |
|------|---------|
| Recruiter opens `/payroll` | Redirected / 403 shown |
| Recruiter calls `GET /api/payroll/salary-structures` | Returns 403 |
| Recruiter calls `GET /api/my/payslips` | Returns own payslips only |
| Recruiter calls `GET /api/my/payslips?employeeId=OTHER` | Returns 403 or ignores param, returns own only |
| Finance User opens `/candidates` | Allowed (view) or restricted per role config |
| Finance User calls `GET /api/payroll/runs` | Returns 403 unless also has Payroll role |
| Sales User opens `/hr/leave/approvals` | Redirected / 403 |
| HR Admin opens `/finance/invoices` | Redirected / 403 |
| Employee views another employee's payslip via direct URL | Returns 403 |
| Any user downloads document without permission | Returns 403 (private storage) |

---

## QA Test Suites (Module Regression)

### Phase 00 — Recruitment ATS (Existing)
- AI screening: score returned, cached on repeat, no duplicate candidate, app record created
- Job URL refresh: SPA fallback works (TC-1.x from TESTING_NOTES.md)
- Unique constraint on applications: no crash on re-screen
- RBAC: Recruiter only sees own JDs (not other recruiters' JDs unless Admin)

### Phase 01 — My Workspace
- Employee can see own leave balance
- Employee cannot see other employee's leave
- Payslip page shows "No payslips yet" before payroll run
- Leave application: balance deducted only after approval
- Claims: own claims visible, other employees' claims not accessible

### Phase 02 — Sales CRM
- Client created: TKG-CL-XXXX generated
- JD assigned to recruiter: appears in recruiter's Job Openings
- Recruiter cannot see billing_rate or payment_terms fields
- Submission created when recruiter submits candidate to JD
- Client 360 Commercials tab: hidden from Recruiter role

### Phase 03 — HR Operations
- Leave applied on public holiday: system warns
- Leave applied when balance = 0: system warns, blocks unless override
- Leave approval queue: manager sees only their team's leaves
- No-pay leave: marked for payroll deduction
- Holiday calendar: KL employee sees KL holidays; Johor employee sees Johor holidays

### Phase 06 — Payroll
- Recruiter cannot access `/payroll` — 403 returned
- Payroll run creates payslip linked to correct Employee ID
- Payslip download: signed URL, not permanent public URL
- Publishing payslip: appears in employee's My Workspace / My Payslips
- Locked payroll period: no changes without adjustment entry

### Phase 07 — Finance
- Invoice created with Client ID + Agreement ID properly linked
- Rate card validator: warns if invoice rate differs from agreed rate
- Duplicate invoice detector: warns if same client + period + assignment already invoiced
- Sales user cannot create/edit invoice — view collection status only

### Phase 05 — Documents
- File upload: rejects non-allowed file types
- File download: generates signed URL (not permanent link)
- Expiry alert: documents expiring in 30 days appear in alerts
- Access control: employee cannot view client documents

---

## Performance & UX Checks

- [ ] All list pages paginated (no unbounded queries)
- [ ] Search / filter works with ID search
- [ ] No broken scrolls on tables (horizontal scroll works on mobile/narrow views)
- [ ] All action buttons disabled during loading (no double-submit)
- [ ] Destructive actions (delete, terminate, cancel) show confirmation dialog
- [ ] All confirmation dialogs require reason for audit log
- [ ] Export buttons show progress indicator for large datasets

---

## Pre-Production Checklist

- [ ] `.env` has all required values documented in `.env.example`
- [ ] Prisma migrations applied cleanly
- [ ] `npm run build` passes without errors
- [ ] `npm run lint` passes
- [ ] All module smoke tests pass
- [ ] Ngrok / production URL configured
- [ ] SSL/HTTPS enforced (no mixed content)
- [ ] Database backups configured
- [ ] No hardcoded `localhost` URLs in production build
- [ ] Health check endpoint (`/api/health`) returns 200
