# Phase 06 — Payroll

**Status:** 🟢 Completed  
**Depends on:** Phase 01 (Employee IDs + ESS base), Phase 03 (Attendance + Leave), Phase 05 (Documents Vault)

---

## Goal

Controlled, user-friendly payroll processing for internal staff and deployed staff.  
Only Payroll Manager, Assistant MD/Managing Director, and explicitly assigned finance roles can process payroll approvals.  
Employees can only view **their own** payslips and submit **their own** claims via My Workspace.

Enterprise governance baseline for this phase:
- Every approval is hierarchical, auditable, and non-self-approvable.
- Department-originated business actions escalate to executive approval.
- MD/Director/Executive Head has cross-department monitoring visibility for pending queue and status control.

---

## Access Rules

| Role | Access |
|------|--------|
| Payroll Manager | Full payroll processing, salary structures, payroll runs, payslips |
| Assistant MD | Final approval authority + cross-module oversight |
| Managing Director | Full access + final approval + audit visibility |
| Finance Manager (optional) | Reporting/review access where explicitly enabled |
| Employees (incl. Recruiters) | My Workspace only: own payslips (read-only), own claims |
| HR Ops Manager | No payroll amounts unless explicitly given payroll permission |
| Sales / Recruitment | No access to any payroll admin pages |

---

## Payroll Sidebar Pages `/payroll`

| Page | Purpose | Access |
|------|---------|--------|
| Payroll Dashboard | Overview, pending, exceptions | Payroll Manager, Assistant MD, Managing Director |
| Salary Structures | Employee salary components, allowances, deductions | Payroll Manager only |
| Payroll Runs | Monthly payroll batch | Payroll Manager, Managing Director |
| Payslips | Generate, publish, manage | Payroll Manager; own view from ESS |
| Claims & Reimbursements | Review, approve, mark paid | Department Manager flow + Assistant MD/MD final |
| Statutory Contributions | EPF, SOCSO, EIS, PCB, HRDF | Payroll Manager, Managing Director |
| Tax Settings | Configurable by country/year/worker/residency | Managing Director, Payroll Manager |
| Payroll Approvals | Review and approval queue | Payroll Manager → Assistant MD/MD |
| Payroll Reports | Cost, deduction, statutory reports | Payroll Manager, Finance Manager, Assistant MD, MD |
| Payroll Audit Logs | Salary change history, payslip generation | Managing Director only |

---

## Payroll Dashboard KPIs

- Payroll period status: Draft / Calculating / Review / Approved / Paid / Closed
- Total employees included in payroll run
- Pending salary setup count
- Pending claims count
- Payroll exceptions (missing bank, missing tax number, missing attendance, negative net pay)
- Gross payroll | Total deductions | Employer contributions | Net payout
- Pending approvals (Payroll Admin / Finance Head / Super Admin)
- Payslips generated | Published | Bank file generated

---

## Phase 6.1 — Salary Structures

Linked to Employee ID or Deployed Staff ID.

| Component | Notes |
|-----------|-------|
| Basic Salary | |
| Allowances | Transport, housing, medical, phone, etc. — itemized |
| Overtime | Rate × hours |
| Claims payout | Approved claims to include in payroll |
| Unpaid Leave Deduction | Based on approved No-Pay Leave days |
| EPF (Employee) | Configurable rate — not hardcoded |
| EPF (Employer) | Configurable rate |
| SOCSO (Employee) | |
| SOCSO (Employer) | |
| EIS | |
| PCB / Income Tax | Based on residency status and tax table |
| HRDF | If applicable |
| Other Deductions | Configurable |
| Net Salary | Calculated |

**Rules:**
- Do not hardcode any statutory rates or percentages
- All rates come from `payroll_settings` / `compliance_rules` table (configurable by Super Admin)
- Every structure change is audit-logged with old value → new value

---

## Phase 6.2 — Payroll Run Flow

**ID:** `TKG-PR-0001`

```
1. Create Payroll Run (Payroll Admin)
   → Select: month, year, entity (Internal Staff / Deployed Staff / Both)
   → Status: Draft

2. System validates data
   → Pulls attendance, leave, No-Pay Leave, overtime, approved claims
   → Flags exceptions: missing bank account, missing EPF/SOCSO, missing attendance, negative net pay
   → Status: Exceptions / Ready

3. Review employee salary items (Payroll Admin)
   → Line-by-line review
   → Corrections allowed with reason (audit logged)
   → Status: Under Review

4. AI Anomaly Check (non-blocking)
   → Flags: unusual salary changes, duplicate entry, missing statutory number
   → Payroll Admin acknowledges or dismisses flags

5. Final Approval (Assistant MD or Managing Director)
   → Status: Approved

6. Generate Payslips (Payroll Manager)
   → PDF payslip per employee, linked to TKG-PS-XXXX
   → Status: Generated

7. Publish to Employee My Workspace
   → Employee can now see read-only payslip in /my-workspace/payslips
   → Status: Published

8. Lock payroll period
   → No changes allowed without adjustment entry + audit log
   → Status: Closed
```

---

## Phase 6.3 — Payslip

**ID:** `TKG-PS-0001`

| Field | |
|------|-|
| Payslip ID | TKG-PS-XXXX |
| Employee ID | TKG-EMP-XXXX |
| Payroll Run ID | TKG-PR-XXXX |
| Period Month / Year | |
| Gross Salary | |
| Allowances itemized | |
| Deductions itemized | |
| Employer contributions | |
| Net Salary | |
| Generated Date | |
| Published Status | |
| PDF Storage Key | Private, signed URL only |

---

## Phase 6.4 — Claims & Reimbursements

| Step | Action |
|------|--------|
| Employee submits claim | Via My Workspace → My Claims (from Phase 01) |
| Finance / Payroll reviews | Approve / Reject with reason |
| Approved claims | Included in next payroll run OR separate reimbursement |
| Mark Paid | After payment, status updated |

---

## Phase 6.5 — Malaysia Statutory Contributions

| Contribution | Who Pays | Applies To |
|-------------|---------|-----------|
| EPF | Employee + Employer | Local Malaysian, long-term expats (based on rule) |
| SOCSO | Employee + Employer | Local Malaysian, expats as per directive |
| EIS | Employee + Employer | As per rule |
| PCB / Income Tax | Employee (deducted from salary) | All employees — rate by residency status |
| HRDF | Employer | As per headcount/sector rule |

**Important:** All rates are configurable via compliance_rules table. Never hardcoded. Payroll/Finance must verify before payroll run.

---

## Phase 6.6 — Payroll Approval Queue

| Step | Owner | Status |
|------|-------|--------|
| 1. Create payroll run | Payroll Manager | Draft |
| 2. System validates + AI checks | System | Exceptions / Ready |
| 3. Review salary items | Payroll Manager | Under Review |
| 4. Final approval | MD / Director / Executive Head | Approved |
| 5. Publish payslips | Payroll Manager | Published |
| 6. Lock period | System | Closed |

Department hierarchy rule applied platform-wide:
- Standard requester flow: Department Head -> MD/Director/Executive Head
- If requester is Department Head role, request moves directly to executive approval level.

---

## Latest Implementation Notes (May 2026)

- Payroll run approval mapping is updated to two-step flow: Payroll Manager (`PAYROLL_ADMIN`) → Executive approver (`MANAGEMENT`/`ADMIN`).
- Backend approval service now enforces two-level cap for leave/claims/overtime: Department Head then Executive.
- Department-head-originated requests bypass department level and route to executive approver only.
- Leadership monitoring API is available for pending approvals by department and module.
- Payroll run execution now supports generate-payslips, publish, and bank transfer CSV export actions from run workflow.
- HR Operations role can access payroll staff/attendance for operational correction while lock rules protect finalized payroll periods.
- Operations Hub payroll KPI mapping now uses live payroll run and claims status counts.
- Payroll admin dashboard no longer duplicates quick-actions panel; sidebar is the single navigation source.
- Employee self-service payslip and claim routes are scoped to own employee profile.
- Claims and leave review routes now call workflow services for hierarchical approvals.
- Signed payslip URL pipeline is active for employee self-service download.
- Bank transfer export now supports template profiles (`STANDARD`, `MAYBANK`, `CIMB`).
- Statutory automation now supports monthly filing batch generation and yearly readiness checks.
- Final role mapping and payroll integrity checks are validated through repeatable E2E suites.
- Operations Hub pending actions now route approver roles directly to actionable approval queues (not passive list views).
- Leave/Claim/Payroll decision actions now notify requesters and department managers immediately on approve/reject or next-level review progression.
- Attendance review changes (create/update/delete) now trigger employee-facing notifications for transparent status tracking.
- Cross-module governance alignment: onboarding/offboarding, visa case status, and finance invoice review now propagate status updates to requestors/owners and leadership visibility groups, matching payroll leave/claim approval behavior.

---

## DB Tables Required

```
payroll_settings
  country, worker_category, effective_date, tax_rule, statutory_rule_json

salary_structures
  id, employee_id, basic, allowances_json, deductions_json,
  effective_from, effective_to, approved_by, created_by, created_at

payroll_runs (TKG-PR-XXXX)
  period_month, period_year, entity_type, status,
  created_by, approved_by_finance, approved_by_admin, locked_at

payroll_run_items
  payroll_run_id, employee_id, gross, net, deductions_json,
  employer_cost, exception_status, exceptions_json

payslips (TKG-PS-XXXX)
  payroll_run_id, employee_id, period_month, period_year,
  gross, net, pdf_storage_key, published_status, published_at,
  generated_at

claims (TKG-CLM-XXXX)
  employee_id, claim_type, amount, currency, claim_date,
  description, receipt_doc_id, status, reviewed_by, paid_at

statutory_contributions
  payroll_run_id, employee_id, epf_employee, epf_employer,
  socso_employee, socso_employer, eis, pcb, hrdf

payroll_audit_logs
  payroll_run_id, employee_id, action,
  old_value, new_value, actor_id, timestamp
```

---

## API Endpoints Required

```
GET  /api/payroll/dashboard
POST /api/payroll/runs                    — Create payroll run (Payroll Admin only)
GET  /api/payroll/runs/:id                — Payroll run detail
PUT  /api/payroll/runs/:id/approve        — Finance/Admin approval
PUT  /api/payroll/runs/:id/publish        — Publish payslips
GET  /api/payroll/payslips/:employeeId    — Payslip list (Payroll Admin)
GET  /api/my/payslips                     — Own payslips (ESS)
GET  /api/my/payslips/:id/download        — Signed URL for own payslip
GET  /api/payroll/salary-structures
POST /api/payroll/salary-structures
PUT  /api/payroll/salary-structures/:id
GET  /api/payroll/claims                  — All claims (Payroll/Finance)
PUT  /api/payroll/claims/:id/approve
```

---

## Audit Log Events

- Payroll run created / status changed
- Salary structure created / modified (old value → new value logged)
- Payslip generated / published / accessed
- Claim approved / rejected / paid
- Tax/statutory settings changed
- Payroll period locked
- Correction entry added to locked period

---

## Latest Implementation Notes (May 2026)

- Payroll run list now supports inline detail view from `/payroll/runs` using `GET /api/payroll/runs/:id`.
- Payroll run flow now includes `Send Review` action from run list for `READY` and `EXCEPTIONS` states via `PUT /api/payroll/runs/:id/review`.
- Validation and review actions are now directly executable from UI without broken navigation fallbacks.
- `/payroll/approvals` page is now active with role-based pending step listing and approve/reject actions against `/api/payroll/approvals/*`.
- Payroll review status is standardized to `UNDER_REVIEW` (compatibility kept for legacy `REVIEW` records in approval processing).
- `/payroll/approvals` now includes approval detail view with run summary and exception preview for safer approve/reject actions.
- Worker category mapping is normalized end-to-end (`INTERNAL_STAFF` / `DEPLOYED_STAFF` / `BOTH`) with compatibility mapping for legacy UI payloads.
- Payroll validation now scopes employees by run `workerCategory` to ensure correct payroll population and mapping integrity.
- `/payroll/runs` now supports status + worker category filters mapped to backend query parameters.
- Payroll run detail panel now includes pending approval actions (approve/reject) via payroll approvals API for single-screen workflow execution.
- Payroll run generation/validation/review access is expanded for operational heads (`HR_ADMIN`, `PAYROLL_ADMIN`, `FINANCE_HEAD`, `MANAGEMENT`, `ADMIN`) while approval-step role checks remain enforced.
- Backup guard is enforced for critical payroll write actions (run create/validate/review and approval actions) requiring a recent DB backup file.
- Role mapping hardening suite added: `test-e2e-role-matrix.js` verifies department-level scoping and payroll data isolation.
- Repeated E2E execution (3 iterations) confirms payroll access for approved roles and explicit deny behavior for non-payroll departments.
- Legacy E2E smoke script updated to current auth response contract and environment-safe optional notification endpoint handling.
- Payroll integrity suite added: `test-e2e-payroll-integrity.js` validates per-payslip deduction/net math and cross-role data isolation.
- Payroll payslip generation is now fault-isolated per employee, returning partial-failure detail without stopping successful employee processing.
- Payroll monitoring summary endpoint now uses partial-data fallback (`Promise.allSettled`) so one failing source does not block the full leadership dashboard.
- Attendance create/delete operations now require recent backup proof to enforce stricter anti-data-loss governance.
