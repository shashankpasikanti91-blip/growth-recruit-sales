# Tekgen AI HRMS — Global Architecture Reference

> ID-first, single-login, role-based workforce platform.  
> Every module connects using IDs. Names, email, and phone are display only — never the system key.

---

## 1. Global ID Reference

| Entity | ID Format | Connected Modules |
|--------|-----------|------------------|
| Client | `TKG-CL-0001` | Sales, Recruitment, Finance, Documents, Analytics |
| Client Contact | `TKG-CNT-0001` | Sales, Follow-ups, Finance |
| Job Description / Requirement | `TKG-JD-0001` | Sales, Recruitment, Submissions, Onboarding, Billing |
| Candidate | `TKG-CAN-0001` | Recruitment, Submissions, Onboarding, Workforce Delivery |
| Submission | `TKG-SUB-0001` | Recruitment, Sales, Client Feedback |
| Employee (internal staff) | `TKG-EMP-0001` | HR Ops, ESS, Attendance, Leave, Payroll, Documents |
| Deployed Staff (employee profile) | `TKG-EMP-0001` + `staffType=DEPLOYED` | HR Ops, My Workspace, Client Billing, Timesheets, Payroll |
| Assignment | `TKG-ASG-0001` | Workforce Delivery, links deployed staff + client + JD |
| Leave Request | `TKG-LV-0001` | HR Ops, ESS, Approval Queue |
| Attendance Record | `TKG-ATT-0001` | HR Ops, Payroll, Timesheets |
| Payroll Run | `TKG-PR-0001` | Payroll, Finance, Audit |
| Payslip | `TKG-PS-0001` | Payroll, ESS (read-only) |
| Invoice | `TKG-INV-0001` | Finance, Client, Sales (view status only) |
| Agreement | `TKG-AGR-0001` | Sales, Finance, Documents |
| Document | `TKG-DOC-0001` | All modules via owner ID |
| Visa Case | `TKG-VISA-0001` | Visa, HR, Documents |
| Audit Log | `TKG-AUD-0001` | All modules |

**Rules:**
- Never depend only on name/email/phone for linking records.
- Candidate ID follows the candidate: sourcing → submission → onboarding → deployment → payroll → invoice → documents.
- Deployed staff must be mapped to a valid `clientId` via active payment agreement.
- All tables must show ID columns. All search bars must support ID search.
- Audit logs must store the related entity ID.

---

## 2. Role Matrix

| Role | Recruitment | Sales CRM | HR Ops | Payroll Admin | Finance | My Workspace (ESS) | Admin |
|------|-------------|-----------|--------|---------------|---------|--------------------|-------|
| Super Admin | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Own | ✅ Full |
| Management | ✅ View | ✅ View | ✅ View | ✅ Reports only | ✅ Reports only | ✅ Own | ✅ Limited |
| Sales Manager | 🔲 Assigned JDs view | ✅ Own clients | ✅ No | 🔲 No | ✅ Collection view | ✅ Own | 🔲 No |
| Sales Executive | 🔲 Assigned JDs view | ✅ Assigned clients | 🔲 No | 🔲 No | ✅ Collection view (own clients) | ✅ Own | 🔲 No |
| Recruitment Manager | ✅ All team JDs | ✅ Assigned JDs (no commercials) | 🔲 No | 🔲 No | 🔲 No | ✅ Own | 🔲 No |
| Recruiter | ✅ Assigned JDs only | ✅ Assigned JDs (no commercials) | 🔲 No | 🔲 No | 🔲 No | ✅ Own | 🔲 No |
| HR Admin | ✅ Onboarding view | 🔲 No | ✅ Full | 🔲 No (unless payroll permission) | 🔲 No | ✅ Own | 🔲 No |
| Payroll Admin | 🔲 No | 🔲 No | 🔲 Leave/attendance data | ✅ Full | 🔲 No (unless finance role) | ✅ Own | 🔲 No |
| Finance User | 🔲 No | ✅ Commercial view | 🔲 No | ✅ Cost summary only | ✅ Full | ✅ Own | 🔲 No |
| Employee (ESS only) | 🔲 No | 🔲 No | 🔲 No | 🔲 No | 🔲 No | ✅ Own only | 🔲 No |
| Deployed / Contractor (ESS only) | 🔲 No | 🔲 No | 🔲 No | 🔲 No | 🔲 No | ✅ Own only | 🔲 No |

---

## 3. Module Sidebar Hierarchy

```
Operations Hub (All users — role-filtered)
├── Recruitment ATS          → Recruiters, Recruitment Managers
│   ├── Job Openings
│   ├── Candidates
│   ├── AI Screening
│   ├── Interviews
│   ├── Selections
│   ├── Onboarding
│   ├── Follow-ups
│   └── Email Templates
├── Sales CRM                → Sales, Management, Admin
│   ├── Sales Dashboard
│   ├── Clients
│   ├── Client Contacts
│   ├── Job Requirements
│   ├── Submissions Tracking
│   ├── Follow-ups
│   ├── Agreements & Commercials
│   └── Client Documents
├── HR Operations            → HR Admin, Management, Admin
│   ├── HR Dashboard
│   ├── Employee Master
│   ├── Leave Management
│   ├── Attendance
│   ├── Onboarding / Offboarding
│   ├── Performance
│   └── Policy Acknowledgement
├── Visa & Permits           → Visa team, HR, Admin
│   ├── Visa Dashboard
│   ├── Visa Cases
│   ├── Permit Renewals
│   ├── Expat Onboarding
│   └── Compliance Settings
├── Payroll                  → Payroll Admin, Finance Head, Management, Super Admin
│   ├── Payroll Dashboard
│   ├── Salary Structures
│   ├── Payroll Runs
│   ├── Payslips
│   ├── Claims & Reimbursements
│   ├── Statutory Contributions
│   ├── Tax Settings
│   └── Payroll Audit Logs
├── Finance & Invoices       → Finance, Management, Admin
│   ├── Finance Dashboard
│   ├── Client Invoices
│   ├── Invoice Drafts
│   ├── Payments & Collections
│   ├── Agreements & Rate Cards
│   ├── Client Ledger
│   └── Finance Reports
├── Documents                → Role-based per owner type
├── Analytics                → Management, Module Heads
└── My Workspace (ESS)       → ALL staff incl. deployed/contractor (own data only)
    ├── My Dashboard
    ├── My Profile
    ├── My Attendance
    ├── My Leave
    ├── My Payslips (read-only)
    ├── My Claims
    ├── My Tax Forms (view-only)
    ├── My Documents
    └── My Calendar
```

---

## 4. Core Data Flow

```
Sales creates Client (TKG-CL-0001)
  → Sales creates JD under Client (TKG-JD-0001)
    → Sales assigns Recruitment Manager / Recruiters
      → JD appears in Recruiter's Job Openings
        → Recruiter sources Candidate (TKG-CAN-0001)
          → Recruiter submits Candidate to JD (TKG-SUB-0001)
            → Sales tracks + submits to Client
              → Interview → Offer → Joined
                → HR creates Employee record (TKG-EMP-0001)
                  → Workforce Delivery creates Deployed Staff (TKG-DEP-0001)
                    → Assignment created (TKG-ASG-0001)
                      → Timesheet/Attendance tracked
                        → Payroll runs (TKG-PR-0001)
                          → Payslip generated (TKG-PS-0001)
                        → Finance generates Invoice (TKG-INV-0001)
                          → Payment tracked → Receipt → Closed
```

---

## 5. Sensitive Data Access Rules

| Data Type | Accessible By | Blocked From |
|-----------|--------------|-------------|
| Salary / Payroll | Payroll Admin, Finance (cost summary), Management, Super Admin | Recruiters, Sales, normal HR |
| Client Billing Rates / Payment Terms | Sales, Finance, Management, Super Admin | Recruiters (cannot edit; can see job summary only) |
| Invoice Details | Finance, Management, Super Admin, Sales (collection view own clients) | Recruiters, HR |
| Visa / Passport Details | Visa team, HR Admin, Super Admin | Recruiters, Sales, Finance |
| Other employees' payslips | Nobody except the employee themselves and Payroll Admin | All other roles |
| Company-wide attendance/leave | HR Admin, Management, Super Admin | Individual employees see only own data |

---

## 5A. Mandatory Backup Guard

- Backup is compulsory before critical HR/Payroll write actions.
- API guard validates latest backup age (24h max) in `C:\Tekgen\backups`.
- Protected write actions:
  - HR employee create/update/import
  - Payroll run create/validate/review
  - Payroll approval approve/reject
- Run backup:
  - `powershell -ExecutionPolicy Bypass -File C:\Tekgen\backup-db.ps1`

---

## 5B. Approval Hierarchy (Current)

- Team member leave/claim/overtime:
  - Department Manager -> Assistant Manager -> Managing Director
- Department manager/head leave/claim/overtime:
  - Assistant Manager -> Managing Director
- Self-approval is blocked by approver self-exclusion in routing.

---

## 5C. Expat Onboarding Documents (Mandatory)

- HR onboarding for expatriates must include:
  - Passport copy, visa/pass expiry details
  - Tax clearance document
  - NOC form
  - Dependent documents where applicable (marriage certificate, children birth certificates, DP documents)
- All uploaded onboarding files are stored under employee document records and linked for visa processing visibility.
- Employees can view own profile/documents in My Workspace but cannot edit HR-owned records (phone self-update only).

---

## 6. Every New DB Table Must Include

```
id             (unique ID, TKG-XXX format for business entities)
tenant_id      (for future multi-tenant isolation)
status         (active/inactive/etc.)
created_by     (user ID)
created_at     (timestamp)
updated_by     (user ID)
updated_at     (timestamp)
audit_log_ref  (link to audit log table)
```

---

## 7. AI Layer Principles

- AI can **suggest, validate, summarize, and warn**.
- AI must **never auto-approve** payroll, invoices, leave, visa, or legal documents.
- AI must **respect RBAC** and never show restricted data to unauthorized users.
- All AI suggestions must be **reviewed and confirmed** by a human before action is taken.
