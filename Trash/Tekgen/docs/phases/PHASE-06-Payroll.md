# Phase 06 — Payroll

**Status:** 🔲 Not Started  
**Depends on:** Phase 01 (Employee IDs + ESS base), Phase 03 (Attendance + Leave), Phase 05 (Documents Vault)

---

## Goal

Controlled, user-friendly payroll processing for internal staff and deployed staff.  
Only Payroll team, Finance Head, Management, and Super Admin can process payroll.  
Employees can only view **their own** payslips and submit **their own** claims via My Workspace.

---

## Access Rules

| Role | Access |
|------|--------|
| Payroll Admin | Full payroll processing, salary structures, payroll runs, payslips |
| Finance Head | Verify payment amount, view payroll cost summary, approve |
| Management | View reports and approval only |
| Super Admin | Full access + audit logs |
| Employees (incl. Recruiters) | My Workspace only: own payslips (read-only), own claims |
| HR Admin | No payroll amounts unless explicitly given payroll permission |
| Sales / Recruitment | No access to any payroll admin pages |

---

## Payroll Sidebar Pages `/payroll`

| Page | Purpose | Access |
|------|---------|--------|
| Payroll Dashboard | Overview, pending, exceptions | Payroll Admin, Finance, Management, Super Admin |
| Salary Structures | Employee salary components, allowances, deductions | Payroll Admin only |
| Payroll Runs | Monthly payroll batch | Payroll Admin, Super Admin |
| Payslips | Generate, publish, manage | Payroll Admin; own view from ESS |
| Claims & Reimbursements | Review, approve, mark paid | Payroll Admin, Finance |
| Statutory Contributions | EPF, SOCSO, EIS, PCB, HRDF | Payroll Admin, Super Admin |
| Tax Settings | Configurable by country/year/worker/residency | Super Admin, Payroll Admin |
| Payroll Approvals | Review and approval queue | Payroll Admin, Finance Head, Super Admin |
| Payroll Reports | Cost, deduction, statutory reports | Payroll, Finance, Management |
| Payroll Audit Logs | Salary change history, payslip generation | Super Admin only |

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

5. Verify payment amount and bank file (Finance Head)
   → Status: Finance Review

6. Final Approval (Super Admin or authorized Management)
   → Status: Approved

7. Generate Payslips (Payroll Admin)
   → PDF payslip per employee, linked to TKG-PS-XXXX
   → Status: Generated

8. Publish to Employee My Workspace
   → Employee can now see read-only payslip in /my-workspace/payslips
   → Status: Published

9. Lock payroll period
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
| 1. Create payroll run | Payroll Admin | Draft |
| 2. System validates + AI checks | System | Exceptions / Ready |
| 3. Review salary items | Payroll Admin | Under Review |
| 4. Verify payout + bank file | Finance Head | Finance Review |
| 5. Final approval | Super Admin / Management | Approved |
| 6. Publish payslips | Payroll Admin | Published |
| 7. Lock period | System | Closed |

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
