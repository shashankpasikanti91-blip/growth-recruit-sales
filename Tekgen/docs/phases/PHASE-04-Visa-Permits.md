# Phase 04 — Visa & Permits

**Status:** 🔲 Not Started  
**Depends on:** Phase 01 (Employee IDs), Phase 03 (Employee Master)

---

## Goal

Manage Malaysia local and expat compliance, work permit applications, renewals, expiry alerts, and related documents. Connect to Employee ID, Candidate ID, and Deployed Staff ID.

---

## Access

| Role | Access |
|------|--------|
| Visa / Compliance Team | Full visa case management |
| HR Admin | View + onboarding support |
| Super Admin | Full access |
| Management | Dashboard view + reports |
| Others | No access (sensitive passport/visa data) |

---

## Visa Dashboard `/visa`

**KPIs:**
- Renewals Due This Month
- Expiring Permits (30 / 60 / 90 day alerts)
- New Applications In Progress
- Rejected / Pending Cases
- Missing Documents
- Cases by Worker Category

---

## Worker Classification

Every employee or deployed staff must be classified:

| Category | Description |
|----------|-------------|
| Local Malaysian | IC-based, EPF/SOCSO/EIS, local tax (PCB) |
| Expat Already in Malaysia | Passport + existing work permit, residency tax status |
| Expat Overseas Hire | Full pre-arrival + post-arrival checklist |
| Contractor | Contract + tax/bank details |
| Client-Deployed Staff | Linked to client assignment |
| Internal Employee | Standard internal headcount |

This classification drives: documents required, statutory contributions, tax rules, visa workflow.

---

## Phase 4.1 — Visa Case Master

**ID:** `TKG-VISA-0001`

| Field | Notes |
|-------|-------|
| Visa Case ID | TKG-VISA-XXXX |
| Worker ID | FK to TKG-EMP or TKG-CAN or TKG-DEP |
| Worker Type | employee / candidate / deployed_staff |
| Worker Name | Display |
| Nationality | |
| Worker Category | Local / Expat in MY / Overseas Expat / Contractor |
| Permit Type | Employment Pass (EP) / Professional Visit Pass (PVP) / Dependent Pass / etc. |
| Permit Status | Application / Approved / Rejected / Expired / Renewal Required |
| Application Date | |
| Approval Date | |
| Expiry Date | |
| Renewal Due Date | Auto-calculated: e.g., 60 days before expiry |
| Case Owner | Visa team member |
| Notes | |
| Created By, Created Date, Updated Date | |

---

## Phase 4.2 — Expat Onboarding Checklist

For **overseas expat hires** — pre-arrival and post-arrival:

**Pre-Arrival:**
- Passport (valid > 18 months)
- Photo (passport size)
- Medical examination docs (if required)
- Education certificates
- Experience letters / employment history
- Offer letter signed
- Application form submitted to authority
- Government approval

**Post-Arrival:**
- Arrival confirmation
- Local address
- Bank account opening
- Tax number registration
- EPF/SOCSO/EIS setup (if applicable by residency status)
- Dependent documents (if family joining)

Each checklist item has: status (Pending / Submitted / Approved / Rejected), due date, uploaded document ID, completed by, completed date.

---

## Phase 4.3 — Local Malaysian Compliance Checklist

| Document / Field | Notes |
|-----------------|-------|
| NRIC (IC) | Mandatory |
| EPF Number | Registration required |
| SOCSO Number | Registration required |
| EIS Number | |
| Tax Number (LHDN/TIN) | |
| Bank Account | For payroll |
| Employment Agreement signed | |
| PCB setup | Monthly tax deduction |

---

## Phase 4.4 — Permit Renewals

- System auto-flags cases expiring within 90 / 60 / 30 days
- Renewal workflow:
  1. Renewal reminder created (linked to Visa Case ID)
  2. Document collection triggered (new renewal docs)
  3. Application submitted to authority
  4. Status tracked: Renewal Pending → Submitted → Approved → Updated

**Expiry Alert Types:**
- Work Permit / Employment Pass expiry
- Passport expiry
- Dependent pass expiry
- Medical certificate expiry
- Contract expiry

---

## Phase 4.5 — Dependent Documents

For expats with family members:
- Dependent name, relationship, passport number
- Dependent pass status and expiry
- Supporting docs: birth certificate, marriage certificate, passport copies

Access: Visa team only

---

## Phase 4.6 — Compliance Settings

Admin-configurable rules (not hardcoded):

| Setting | |
|---------|-|
| Country | |
| Worker Category | |
| Year | |
| Tax Rate / Residency Rule | e.g., non-resident flat rate for first 182 days |
| Statutory Contribution Rule | Which categories pay EPF / SOCSO / EIS |
| Required Document Checklist | By worker category |
| Effective Date | Rule becomes active from this date |

Access: Super Admin / Compliance Admin only

---

## DB Tables Required

```
visa_cases          (TKG-VISA-XXXX)
  worker_id, worker_type, nationality, worker_category,
  permit_type, permit_status, application_date, approval_date,
  expiry_date, renewal_due_date, case_owner_id,
  created_by, created_at, updated_by, updated_at

visa_documents      (TKG-DOC-XXXX, owner_type='VISA_CASE', owner_id=TKG-VISA-XXXX)

expat_onboarding_checklist
  visa_case_id, item_name, item_phase (pre/post),
  status, due_date, doc_id, completed_by, completed_at

expiry_alerts
  visa_case_id, alert_type (passport/permit/dependent/contract),
  expiry_date, alert_days (90/60/30), triggered_at, acknowledged_by

compliance_rules
  country, worker_category, year, rule_type, rule_value, effective_date,
  configured_by, created_at
```

---

## UI Pages Required

- `/visa` — Visa Dashboard
- `/visa/cases` — Visa case list + filters (expiring, by category)
- `/visa/cases/new` — New visa case
- `/visa/cases/:id` — Visa Case 360 (checklist, documents, timeline)
- `/visa/renewals` — Renewals tracker (by expiry date)
- `/visa/compliance` — Compliance settings (Admin only)

---

## Audit Log Events

- Visa case created / status updated
- Permit renewal triggered
- Document uploaded / verified / rejected
- Expiry alert sent
- Compliance rule changed
