# Phase 08 — Workforce Delivery

**Status:** 🔲 Not Started  
**Depends on:** Phase 00 (Candidate ID), Phase 02 (Client/JD IDs), Phase 03 (Attendance base)

---

## Goal

After a candidate is **Joined**, convert them into a **Deployed Staff** record.  
Track their assignment to the client site, timesheets, attendance, and billing readiness.  
This bridges Recruitment ↔ Payroll ↔ Finance using IDs.

---

## Core Concept

| Stage | Entity | ID |
|-------|--------|-----|
| Sourced / Screened | Candidate | TKG-CAN-XXXX |
| Joined / Deployed | Deployed Staff | TKG-DEP-XXXX (created after joining) |
| Client Assignment | Assignment | TKG-ASG-XXXX (links Deployed Staff + Client + JD) |

The **Deployed Staff ID** is only created after the candidate confirms joining.  
The **Assignment ID** links the deployed staff to the client, the JD, and the billing terms.

---

## Phase 8.1 — Deployed Staff Master

**ID:** `TKG-DEP-0001`

| Field | Notes |
|-------|-------|
| Deployed Staff ID | TKG-DEP-XXXX |
| Candidate ID | FK — original candidate who joined |
| Employee ID (if also internal) | FK — optional |
| Full Name | |
| Nationality | |
| Worker Category | Local / Expat / Overseas Hire / Contractor |
| Visa Case ID | FK — if expat |
| Status | Active / On Notice / Completed / Terminated |
| Start Date | |
| End Date (if contract) | |
| Created By | |
| Created Date | Updated Date |

---

## Phase 8.2 — Assignment Master

**ID:** `TKG-ASG-0001`

| Field | Notes |
|-------|-------|
| Assignment ID | TKG-ASG-XXXX |
| Deployed Staff ID | FK |
| Client ID | FK |
| JD ID | FK |
| Agreement ID | FK — billing terms |
| Bill Rate | Protected by Finance/Sales role |
| Pay Rate | |
| Rate Type | Monthly / Hourly / Daily |
| Assignment Start Date | |
| Assignment End Date | |
| Work Location | Client site |
| Reporting Manager at Client | |
| Status | Active / Completed / Terminated |
| Created By | |
| Created Date | Updated Date |

---

## Phase 8.3 — Timesheets

Timesheets capture hours/days worked by deployed staff at client sites.

| Field | Notes |
|-------|-------|
| Timesheet ID | |
| Assignment ID | FK |
| Deployed Staff ID | FK |
| Period (Month/Year or Week) | |
| Daily records | Date, Hours/Day, Overtime, Rest Day, Public Holiday |
| Total Regular Hours | |
| Total Overtime Hours | |
| Status | Draft / Submitted / Client Approved / Payroll Linked / Invoiced |
| Client Sign-off | Optional: client approval or self-declaration |
| Submitted By | |
| Submitted Date | |

**Timesheet feeds:**
- Payroll (pay rate × hours)
- Finance (bill rate × hours → invoice line item)

---

## Phase 8.4 — Client Attendance (Deployed Staff)

Separate from internal employee attendance (Phase 03).

| Feature | |
|--------|-|
| Daily attendance per deployed staff | Linked to Assignment ID + Client ID |
| Monthly view | Present / Absent / On Leave / Public Holiday / Rest Day |
| Corrections | HR/Delivery Manager with reason |
| Feeds payroll | No-pay / overtime calculation |
| Feeds invoice | Billing days/hours basis |

---

## Phase 8.5 — Workforce Dashboard `/workforce`

**KPIs:**
- Total Active Deployed Staff
- Deployments Expiring This Month
- Timesheets Pending Submission
- Timesheets Pending Client Approval
- Ready for Invoice (timesheet approved, not yet invoiced)
- Ready for Payroll (timesheet approved, not yet in payroll run)

**Views:**
- Active deployments by client
- Deployment timeline (Gantt-style or calendar)
- Staff without timesheets (this period)
- Billing readiness status per client

---

## DB Tables Required

```
deployed_staff (TKG-DEP-XXXX)
  candidate_id, employee_id (optional), name, nationality,
  worker_category, visa_case_id, status, start_date, end_date

assignments (TKG-ASG-XXXX)
  deployed_staff_id, client_id, jd_id, agreement_id,
  bill_rate, pay_rate, rate_type,
  start_date, end_date, work_location, client_manager,
  status, created_by, created_at, updated_at

timesheets
  assignment_id, deployed_staff_id, period_month, period_year,
  timesheet_lines_json (date, hours, overtime, type),
  total_regular_hours, total_overtime_hours,
  status, submitted_by, submitted_at,
  client_approved_by, client_approved_at

deployed_attendance
  assignment_id, deployed_staff_id, date,
  status (Present/Absent/Leave/PH/RestDay),
  clock_in, clock_out, corrected_by, correction_reason
```

---

## UI Pages Required

- `/workforce` — Workforce Dashboard
- `/workforce/staff` — Deployed Staff list
- `/workforce/staff/:id` — Deployed Staff 360 (assignments, timesheets, attendance, docs)
- `/workforce/assignments` — Assignment list
- `/workforce/assignments/:id` — Assignment detail
- `/workforce/timesheets` — Timesheet management
- `/workforce/timesheets/:id` — Timesheet detail + approval

---

## Connections to Other Phases

| Phase | Connection |
|-------|-----------|
| Phase 02 Sales CRM | Client ID + JD ID + Agreement ID come from Sales |
| Phase 04 Visa & Permits | Deployed staff visa case linked by TKG-VISA-XXXX |
| Phase 05 Documents | Assignment agreements, permit docs stored in Document Vault |
| Phase 06 Payroll | Approved timesheet → payroll run item (pay rate × hours) |
| Phase 07 Finance | Approved timesheet → invoice line item (bill rate × hours) |

---

## Audit Log Events

- Deployed Staff record created / status changed
- Assignment created / updated / terminated
- Timesheet submitted / approved / rejected
- Attendance corrected
