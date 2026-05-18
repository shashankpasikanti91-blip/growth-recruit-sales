# Pilot, demos, and external / staff access

## What to tell management

- **Recruitment, HR Operations, and Payroll** are demo-ready on **staging or a dedicated demo tenant** without depending on Sales.
- **Staff (role `EMPLOYEE`)** and similar workspace-only roles see **My Workspace** after login (leave, payslips, profile, attendance, claims, documents)—not the full Operations Hub.
- **Client-side leave approvers (`CLIENT_APPROVER`)** see **Performance → Approval Queue** plus **My Workspace**, and land on the queue after login. They are not given full ATS/HR module menus.
- **Automated E2E** includes a **deployed staff + client approver** leave path in `tekgen-ats-backend/test-e2e-full-lifecycle.js`, plus multi-department L1/L2 in `test-e2e-department-approvals.js` (use `--align` on that script only when fixing drifted demo manager departments).

## What *not* to promise

- Do not share **production** HR/payroll URLs as an open pilot without security, access review, and formal agreements.
- Prefer **invite-only accounts** on **demo/staging** with passwords distributed over a secure channel.

## Technical checklist before sharing a URL

1. API and DB up; frontend build deployed and pointed at the correct `API_BASE` / `NEXT_PUBLIC_*` settings.
2. Create or sync **pilot users** with the right **role** (`EMPLOYEE`, `CLIENT_APPROVER`, etc.).
3. Run **`npm run test:e2e:unified`** against that environment when possible (API running; use `--align` only via the unified runner for the department phase, or avoid on shared DBs—see `test-e2e-department-approvals.js` header).

## Role → experience (frontend)

| Role | Primary landing | Module nav |
|------|-----------------|------------|
| `EMPLOYEE` (+ viewer / deployed / contractor labels if used) | `/workspace` | My Workspace only |
| `CLIENT_APPROVER` | `/workspace/approval-queue` | Performance (approval queue) + My Workspace |
| Recruiters / managers / admins | `/dashboard` or role-specific home | Per `Sidebar.js` `ROLE_MODULE_ACCESS` |
