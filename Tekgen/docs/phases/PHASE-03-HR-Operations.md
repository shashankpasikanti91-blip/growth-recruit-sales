# Phase 03 — HR Operations + Malaysia Leave & Holiday Engine

**Status:** 🟡 In Progress  
**Priority:** HIGH  
**Depends on:** Phase 01 (Employee ID / My Workspace base)

---

## Goal

Manage **internal company employees** (recruiters, HR staff, finance, sales, admin).  
Add Malaysia state-wise public holiday calendar.  
Full leave balance logic, leave application, and approval queue.  
Attendance tracking for internal employees.

---

## Module: HR Operations

**Access:** HR Ops Manager, Assistant MD, Managing Director  
**Sidebar:** HR Operations → sub-pages

---

## HR Dashboard `/hr`

**KPIs:**
- Total Employees
- New Joiners This Month
- Pending Leave Requests
- Attendance Today (Present / Absent / On Leave)
- Employees with Missing Documents
- Probation Due This Month
- Birthdays / Work Anniversaries

---

## Phase 3.1 — Employee Master

**ID:** `TKG-EMP-0001`

| Field | Notes |
|-------|-------|
| Employee ID | TKG-EMP-XXXX (created at join date) |
| Full Name | |
| NRIC / Passport No | |
| Nationality | |
| Date of Birth | |
| Gender | |
| Personal Email | |
| Work Email | |
| Phone | |
| Emergency Contact Name / Phone / Relationship | |
| Department | |
| Designation | |
| Employment Type | Internal / Contractor / Client-Deployed |
| Manager / Reporting To | FK to another Employee |
| Work Location | Office / Remote / Client Site |
| Work Country | |
| Work State | Malaysia: KL / Selangor / Johor / Sabah / Sarawak / etc. |
| Holiday Calendar | Auto-mapped from Work State |
| Join Date | |
| Probation End Date | |
| Confirmation Date | |
| Status | Active / Probation / On Notice / Resigned / Terminated |
| Bank Name | |
| Bank Account No | |
| EPF Number | |
| SOCSO Number | |
| EIS Number | |
| Tax Number (LHDN/TIN) | |
| Created By | |
| Created Date | Updated Date |

**Employee 360 Page Tabs:**
1. Personal Info
2. Employment Details
3. Leave & Attendance
4. Payroll (Payroll Admin / HR Admin only)
5. Documents
6. Performance
7. Activity Log

---

## Phase 3.2 — Malaysia Leave System

### Leave Types
| Type | Notes |
|------|-------|
| Annual Leave | Standard entitlement |
| Medical / Sick Leave | Medical cert required for > N days |
| Hospitalization Leave | Separate entitlement, doc required |
| No Pay Leave | Must affect payroll deduction |
| Replacement Leave | Earned for working on rest/holiday |
| Compassionate Leave | Bereavement |
| Company Off Day | Company-declared closure |
| Other (configurable) | Admin can add leave types |

### Leave Balance Per Employee

| Field | Description |
|-------|-------------|
| Entitlement | Based on employment type, length, grade |
| Carry Forward | From previous year (capped by policy) |
| Taken | Approved and completed |
| Pending Approval | Submitted but not yet approved |
| Remaining | Entitlement + CF - Taken - Pending |
| Future Booked | Approved but future dates |

**Show balance BEFORE employee applies** — warn if balance is insufficient.

---

## Phase 3.3 — Malaysia State Holiday Calendar

Each employee is mapped to a **Work State**. The system loads public holidays for that state + year.

| Feature | Requirement |
|---------|-------------|
| National Holidays | Hari Merdeka, Malaysia Day, Chinese New Year, Deepavali, Hari Raya, Thaipusam (national), Christmas, etc. |
| State Holidays | KL, Selangor, Johor, Penang, Sabah, Sarawak, etc. differ |
| Rest Days | Configurable: Saturday+Sunday / Sunday only / shift-based |
| Company Off Days | Admin declares company closure dates |
| Holiday Calculation | When employee applies leave, system auto-excludes PH, rest days, company off days from the count |
| Year-based | Holiday data stored per `(country, state, year)` |
| Configurable | HR Admin can edit/add/remove holidays per year |

**DB: `holiday_calendars`**
```
country, state, year, holiday_name, date, type (national/state/company), active
```

**Employee mapping:**
```
employee_profiles.work_state → holiday_calendars (country, state, year)
```

---

## Phase 3.4 — Leave Application Flow

### Apply Leave (Employee via My Workspace)
1. Employee selects: leave type, start date, end date, session (full/AM/PM), reason, attachment
2. System validates:
   - Checks balance — warns if insufficient
   - Excludes public holidays, rest days, company off days from date count
   - Warns if dates overlap existing approved/pending leave
   - Warns if applying on a public holiday or rest day
   - Requires attachment if policy mandates (e.g., medical cert for sick leave > 1 day)
3. Leave request created with `TKG-LV-XXXX`
4. Status: `Submitted → Pending Approval`
5. Notification sent to approver

### Leave Approval Queue (`/hr/leave-approvals`)

| Column | |
|--------|-|
| Leave ID | TKG-LV-XXXX |
| Employee Name + ID | |
| Department | |
| Leave Type | |
| Dates + Duration | |
| Balance Remaining | |
| Reason | |
| Attachment | |
| Conflict Warnings | e.g., "Another team member on leave same day" |
| Status | |
| Actions | Approve / Reject / Request Clarification |

### Approval Levels (Current Approved Hierarchy)

| Level | Approver | Action |
|-------|---------|--------|
| Level 1 | Department Manager (Recruitment / Sales / HR Ops / Payroll / Finance manager) | Approve / Reject / Clarify |
| Level 2 | Assistant MD or Managing Director | Final Approve / Reject |
| Payroll sync | Payroll Manager only | Approved No-Pay Leave affects payroll calculation |

### Leave Status for Employee
`Draft → Submitted → Pending Approval → Approved / Rejected / Cancelled`

---

## Phase 3.5 — Attendance

| Feature | |
|--------|-|
| Monthly calendar view | Shows each day: Present / Absent / On Leave / Public Holiday / Rest Day |
| Clock-in / Clock-out | Optional (system or manual HR entry) |
| Attendance corrections | HR Admin can correct records with reason + audit log |
| Absent auto-flag | Days with no record and no approved leave flagged |
| Attendance affects payroll | No-pay days calculated from attendance gaps |

**DB: `attendance_records`**
```
id (TKG-ATT-XXXX), employee_id, date, clock_in, clock_out,
status (Present/Absent/Leave/PH/RestDay/CompanyOff),
corrected_by, correction_reason, created_at
```

---

## Phase 3.6 — HR Operations Sub-Modules

### Onboarding
- Offer checklist
- Joining document collection (mapped to Document Vault - Phase 05)
- Employee record creation on join
- Task assignment (who does what for new joiner)
- Linked to Candidate ID (if via recruitment) → creates Employee ID after join

### Offboarding
- Exit request / resignation
- Asset return checklist
- Final settlement checklist
- Document archiving
- Status change to Resigned/Terminated with effective date

### Performance
- Goals setting (Manager → Employee)
- Review cycle (quarterly / annual)
- Probation review
- Feedback notes

### Policy Acknowledgement
- Upload company policy documents
- Employee reads and acknowledges (digital signature or checkbox)
- Version tracking
- HR can see who has/hasn't acknowledged

---

## DB Tables Required

```
employee_profiles    (extend from Phase 01 base)
  + work_state, probation_end_date, confirmation_date, epf_no, socso_no, eis_no, tax_no

holiday_calendars
  id, country, state, year, holiday_name, date, type, active

leave_types
  id, name, code, entitlement_days, carry_forward_max,
  requires_attachment_after_days, is_no_pay, is_configurable

leave_balances       (from Phase 01, extended here)
  + entitlement, carry_forward, carry_forward_expiry

leave_requests       (from Phase 01, extended here)
  + session (Full/AM/PM), approver_level_1_id, approver_level_1_status,
    approver_level_2_id, approver_level_2_status, final_approver_id, final_status

leave_approval_queue
  leave_request_id, approver_id, approver_level, action, comment, actioned_at

attendance_records   (TKG-ATT-XXXX)

onboarding_tasks
  employee_id, task_name, assigned_to, due_date, completed_at, status

offboarding_checklist
  employee_id, item_name, completed_by, completed_at, status

performance_reviews
  employee_id, reviewer_id, period, goals_json, score, comments, status

policy_documents
  id, title, version, file_doc_id, effective_date, requires_acknowledgement

policy_acknowledgements
  employee_id, policy_id, acknowledged_at, version
```

---

## UI Pages Required

- `/hr` — HR Dashboard
- `/hr/employees` — Employee list + search by TKG-EMP ID
- `/hr/employees/new` — Add employee
- `/hr/employees/:id` — Employee 360
- `/hr/leave` — Leave management overview
- `/hr/leave/approvals` — Approval queue
- `/hr/leave/balances` — Leave balance admin view
- `/hr/leave/settings` — Leave type configuration
- `/hr/attendance` — Attendance admin view
- `/hr/holidays` — Holiday calendar management
- `/hr/onboarding` — Onboarding tracker
- `/hr/offboarding` — Offboarding tracker
- `/hr/performance` — Performance reviews
- `/hr/policies` — Policy documents

---

## Latest Implementation Notes (May 2026)

- Core leave + claim multi-level approval service is integrated with Department Manager → Assistant MD/MD flow.
- ESS access for own records is active via `/workspace/*` routes (own leave, claims, attendance, payslips, documents, statutory forms).
- HR leave admin review route is mapped to multi-level workflow service (not one-step direct status update).
- HR dashboard KPIs are now live from API; employee directory, Add Employee, and Employee 360 edit are active.
- Attendance page now supports HR correction actions with direct status update save.
- `/hr/holidays` is now active with year filtering, create holiday, and delete custom holiday actions.
- Employee profile manager assignment (`managerId`) is now manageable in Add/Edit employee screens to support approval routing visibility.
- `/hr/onboarding` and `/hr/offboarding` operational trackers are now active with status transition actions and audit logging.
- HR leave management now includes policy warning indicators (team overlap, employee overlap, missing medical attachment, no-pay payroll impact).
- Bulk staff onboarding support is now active via `/hr/employees/import` (CSV import with manager mapping and safe existing-user updates).
- Deployed/internal employee roles are constrained to My Workspace-only navigation for operational safety.
- My Workspace attendance now supports one-time daily submit (no self-edit after submission).
- Approval routing is now architected to prevent self-approval for managers:
  - Team members: Department Manager -> Assistant Manager -> Managing Director
  - Department Managers/Heads: Assistant Manager -> Managing Director
- Employee provisioning rules are now explicit:
  - HR creates login + Employee ID for every internal/deployed staff.
  - Role-to-department mapping is validated for managerial/admin roles.
  - Deployed staff require client mapping (`clientId`) and are linked via active payment agreement.
- Backup guard is enforced for critical HR staff write actions (create/update/import) requiring a recent DB backup file.
- Remaining work is performance/policy modules and stricter leave policy rule configuration.

---

## Audit Log Events

- Employee created / status changed / terminated
- Leave applied / approved / rejected / cancelled / modified
- Attendance corrected
- Holiday calendar updated
- Policy uploaded / acknowledged
- Onboarding / offboarding task completed
