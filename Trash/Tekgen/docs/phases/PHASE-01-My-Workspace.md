# Phase 01 — My Workspace / Employee Self-Service (ESS)

**Status:** 🔲 Not Started  
**Priority:** HIGH — Next to implement  
**Depends on:** Phase 00 (done)

---

## Goal

Every internal team member (recruiter, HR, sales, finance, payroll user) gets personal self-service pages under the **same login**. Work modules appear based on role. Personal ESS pages appear for everyone.

Recruiters must **not** need a separate HR system login to see their own leave, payslips, or profile.

---

## What to Build

### 1. Employee ID Mapping
- Map every existing user to an Employee ID (`TKG-EMP-0001`)
- Add `employeeId` field to the `users` table (or a new `employee_profiles` table linked by `userId`)
- Employee ID must be permanent and follow the user across all modules

### 2. My Workspace Sidebar Section
Add a **My Workspace** section in the sidebar visible to ALL logged-in users:

| Page | Purpose |
|------|---------|
| My Dashboard | Personal pending actions: leave pending, attendance today, payslip available, upcoming holidays |
| My Profile | Personal info, emergency contact, bank/tax details, employment details, documents, notification settings |
| My Attendance | Clock-in/out, monthly attendance calendar, absent/rest day/public holiday view |
| My Leave | Leave balances, apply leave, leave history, leave status |
| My Payslips | Read-only payslip list + PDF download (own only) |
| My Claims | Submit expense claim, attach receipt, view status (own only) |
| My Tax Forms | View/download own EA/CP tax forms |
| My Documents | Employment letter, contracts, personal documents (own only) |
| My Calendar | Company holidays, state holidays, rest days, leave status |

### 3. My Profile Fields
- Full Name, NRIC/Passport No, Nationality
- Date of Birth, Gender
- Contact: Phone, Personal Email
- Emergency Contact: Name, Relationship, Phone
- Bank Details: Bank Name, Account No (masked in display)
- Tax Number (LHDN/TIN)
- EPF / SOCSO / EIS numbers
- Employment: Employee ID, Department, Designation, Manager, Work Location, Employment Type, Join Date
- Work State/Location (for Malaysia holiday calendar mapping)

### 4. My Leave (Basic)
- Show leave balance (entitlement, carry forward, taken, pending approval, remaining)
- Apply for leave: select type, dates, reason, attach supporting document
- View leave history with status
- Leave application creates a `TKG-LV-XXXX` ID
- Status shows: Draft → Submitted → Pending Approval → Approved / Rejected / Cancelled

> **Full leave approval queue and Malaysia holiday engine** → Phase 03

### 5. My Attendance (Basic)
- View own attendance records
- Monthly calendar view (Present, Absent, Public Holiday, Rest Day, On Leave)
- Attendance record linked by `TKG-EMP-XXXX` + date

> **Full clock-in/out, timesheet, and deployed staff attendance** → Phase 08

### 6. My Payslips (Read-only)
- List of published payslips by month/year
- View payslip detail
- Download PDF (private signed URL, not public link)
- Payslip data comes from Payroll module (Phase 06)
- Before payroll module is built: page shows "No payslips yet" placeholder

### 7. My Claims (Basic)
- Submit claim with: claim type, amount, date, receipt attachment, description
- View own claim list with status: Submitted → Under Review → Approved / Rejected / Paid
- Claim linked to Employee ID

> **Full claims processing and payroll integration** → Phase 06

---

## Access Rules

| Who Sees My Workspace | What They See |
|----------------------|--------------|
| All logged-in users | Their own data only (ESS) |
| Recruiter | Own leave, attendance, payslips, claims, profile |
| HR Admin | Same ESS pages + HR Operations module separately |
| Payroll Admin | Same ESS pages + Payroll module separately |
| Finance User | Same ESS pages + Finance module separately |
| Super Admin | Full ESS + all admin modules |

**Restriction:** No user can see another employee's ESS data through My Workspace pages.

---

## DB Changes Required

```
employee_profiles
  id              (TKG-EMP-XXXX)
  user_id         (FK to users)
  department
  designation
  manager_id      (FK to employee_profiles)
  work_location
  work_state      (for Malaysia holiday mapping)
  employment_type (Internal / Contractor / Deployed)
  join_date
  status          (Active / On Leave / Resigned / Terminated)
  created_by, created_at, updated_by, updated_at

leave_balances
  id
  employee_id     (FK to employee_profiles)
  leave_type
  year
  entitlement
  carry_forward
  taken
  pending_approval
  remaining
  created_at, updated_at

leave_requests
  id              (TKG-LV-XXXX)
  employee_id
  leave_type
  start_date, end_date
  sessions        (Full Day / AM / PM)
  reason
  attachment_doc_id
  status          (Draft / Submitted / Approved / Rejected / Cancelled)
  applied_at
  approved_by
  approved_at
  created_by, created_at, updated_by, updated_at

claims
  id              (TKG-CLM-XXXX)
  employee_id
  claim_type
  amount
  currency
  claim_date
  description
  receipt_doc_id
  status          (Submitted / Under Review / Approved / Rejected / Paid)
  created_by, created_at, updated_by, updated_at
```

---

## UI Pages Required

- `/my-workspace` — My Dashboard (landing)
- `/my-workspace/profile` — My Profile edit
- `/my-workspace/attendance` — My Attendance calendar
- `/my-workspace/leave` — Leave balance + apply + history
- `/my-workspace/payslips` — Payslip list + PDF view
- `/my-workspace/claims` — Claims submission + list
- `/my-workspace/tax-forms` — Tax form download
- `/my-workspace/documents` — Own documents
- `/my-workspace/calendar` — Holidays + leave calendar

---

## API Endpoints Required

```
GET  /api/my/profile           — own employee profile
PUT  /api/my/profile           — update own profile
GET  /api/my/attendance        — own attendance records (month/year filter)
GET  /api/my/leave/balance     — own leave balance
POST /api/my/leave             — apply for leave
GET  /api/my/leave             — own leave history
PUT  /api/my/leave/:id/cancel  — cancel pending leave
GET  /api/my/payslips          — own payslip list
GET  /api/my/payslips/:id      — own payslip detail + signed URL
POST /api/my/claims            — submit a claim
GET  /api/my/claims            — own claims list
GET  /api/my/calendar          — holidays + leave calendar for employee's state
```

---

## Security Notes
- Every API must verify `req.user.id` and return only that user's own data
- Payslip PDF must use a signed URL (expiry: 15–30 minutes), never a permanent public link
- Receipt and document attachments same — private, signed URL
- No salary amounts or bank details in server logs
