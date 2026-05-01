# Phase 07 — Finance & Invoices

**Status:** 🔲 Not Started  
**Depends on:** Phase 02 (Client + Agreement IDs), Phase 06 (Payroll — for cost data), Phase 08 (Workforce Delivery — for timesheets)

---

## Goal

Finance team owns client invoice generation, payment collection, receipts, and revenue tracking.  
Sales can view invoice status for **their own clients** (collection follow-up only).  
Finance does not expose salary or payroll data to Sales or Recruitment.

---

## Access Rules

| Role | Access |
|------|--------|
| Finance User | Full invoice management, payments, collections, reporting |
| Finance Head | Approval of invoices before sending |
| Super Admin | Full access |
| Management | View reports and dashboards |
| Sales Executive | View invoice status + collection follow-up for own clients only |
| Payroll Admin | No invoice access (unless also has Finance role) |
| Recruiter / HR | No access |

---

## Finance Sidebar Pages `/finance`

| Page | Purpose |
|------|---------|
| Finance Dashboard | Revenue overview, pending invoices, overdue, collections |
| Client Invoices | Create and manage all invoices |
| Invoice Drafts | AI-assisted draft invoices before approval |
| Payments & Collections | Track paid, partial, overdue, follow-up |
| Agreements & Rate Cards | Commercial agreement reference |
| Billing Rules | Monthly, hourly, daily, placement fee, milestone |
| Receipts | Upload payment proof and receipts |
| Credit Notes / Adjustments | Corrections, refunds, discounts |
| Client Ledger | All invoices + payments + outstanding balance per client |
| Finance Reports | Revenue, aging, profitability, margin, tax reports |

---

## Finance Dashboard KPIs

- Pending Invoices (count + total amount)
- Invoices Overdue (count + amount)
- Payments Received This Month
- Client Outstanding Aging (30 / 60 / 90+ days)
- Draft Invoices from Deployed Staff
- Revenue by Client (bar chart)
- Margin by JD / Client
- Collection Follow-ups Pending
- Receipts Pending Upload

---

## Phase 7.1 — Invoice Types

| Type | Source Data |
|------|------------|
| Recruitment Placement Invoice | Client ID, JD ID, Candidate ID, offer/joining confirmation, agreed fee |
| Contract Staffing Monthly Invoice | Assignment ID, Deployed Staff ID, attendance/timesheet, rate card |
| Hourly / Daily Timesheet Invoice | Approved timesheet, client rate, overtime rules |
| Payroll Outsourcing Invoice | Employee count, payroll run, agreed service fee |
| Visa / Permit Service Invoice | Visa Case ID, service agreement, government fee |
| Project / Service Invoice | Agreement ID, milestone, service description |
| Adjustment / Credit Note | Original Invoice ID, approval note |

---

## Phase 7.2 — Invoice Fields

**ID:** `TKG-INV-0001`

| Section | Fields |
|---------|--------|
| Invoice Header | Invoice ID, Client ID, Client Name, Billing Contact, Invoice Date, Due Date, Currency, Tax Type, Payment Terms |
| Commercial Link | Agreement ID, Rate Card ID, JD ID, Assignment ID, Sales Owner, Finance Owner |
| Billing Lines | Description, Worker/Candidate ID, Quantity, Rate, Unit, Tax %, Discount, Line Total |
| Totals | Subtotal, Tax Amount, Adjustment, Grand Total, Paid Amount, Balance Due |
| Status | Draft / Submitted / Approved / Sent / Partially Paid / Paid / Overdue / Cancelled |
| Documents | Invoice PDF, agreement copy, timesheet, PO, receipt, credit note |
| Audit | Created by, approved by, sent by, paid by, timestamps, change log |

---

## Phase 7.3 — Invoice Data Flow

```
Sales creates Client + Agreement (TKG-AGR-XXXX) with rate card + payment terms
  → Candidate joins / Deployed Staff confirmed
    → Workforce Delivery creates Assignment (TKG-ASG-XXXX)
      → Timesheet / Attendance confirmed
        → Finance creates Invoice Draft
          (linked to: Client ID + Agreement ID + JD ID + Assignment ID + Deployed Staff ID)
            → AI validates: rate card match, duplicate check, missing docs, tax fields
              → Finance reviews and adjusts
                → Finance Head approves
                  → Invoice PDF generated (TKG-INV-XXXX)
                    → Sent to client (tracked)
                      → Payment received → Receipt uploaded → Invoice Closed
```

---

## Phase 7.4 — Invoice Approval Queue

| Step | Owner | Status |
|------|-------|--------|
| 1. Create invoice draft | Finance User | Draft |
| 2. AI validates IDs, rate card, duplicate risk, tax | System + AI | Needs Review / Ready |
| 3. Finance verifies invoice lines | Finance User | Reviewed |
| 4. Approve invoice | Finance Head / Super Admin | Approved |
| 5. Send to client | Finance / Sales (if allowed) | Sent |
| 6. Payment follow-up | Finance + Sales owner view | Pending / Overdue |
| 7. Receipt upload and close | Finance | Paid / Closed |

---

## Phase 7.5 — Payments & Collections

| Field | Notes |
|-------|-------|
| Payment Date | |
| Amount Received | |
| Payment Method | Bank transfer / Cheque / Online |
| Reference No | |
| Receipt Document | Uploaded to Document Vault |
| Partial Payment | Supported — balance tracked |
| Overdue Flag | Auto-set after due date |
| Collection Follow-up | Date, owner, remarks, next action date |

**Collection Follow-up View:**
- Overdue invoices list
- Days overdue
- Last follow-up date + notes
- Next action date
- Owner (Finance + Sales owner limited view)

---

## Phase 7.6 — Agreements & Rate Cards

**ID:** `TKG-AGR-0001`

| Field | |
|------|-|
| Agreement ID | TKG-AGR-XXXX |
| Client ID | |
| Agreement Type | MSA / SOW / NDA / LOA / Rate Card |
| Start Date | |
| End Date | |
| Rate Type | Monthly / Hourly / Daily / Placement Fee % / Milestone |
| Bill Rate | |
| Pay Rate | |
| Markup % | |
| Currency | |
| Payment Terms | e.g., Net 30 / Net 60 |
| Signed Document | Linked to Document Vault |
| Status | Active / Expired / Pending Renewal |
| Expiry Alert | 90/60/30 days before expiry |

---

## Phase 7.7 — Client Ledger

Per client view:
- All invoices (paid, pending, overdue)
- Payments received
- Credit notes applied
- Outstanding balance
- Aging summary (Current / 30 days / 60 days / 90+ days)

---

## Phase 7.8 — Finance Reports

| Report | |
|-------|-|
| Revenue by Client | Monthly, quarterly, annual |
| Invoice Aging | Current + overdue breakdown |
| Collection Performance | Follow-up rate, days to collect |
| Client Profitability | Revenue - Costs (if cost data available from Payroll) |
| Open Invoices | All unpaid as of today |
| Tax / SST Report | Tax amounts by period |
| Invoice Summary | By status, by period, by client |

---

## DB Tables Required

```
agreements (TKG-AGR-XXXX)
  client_id, agreement_type, start_date, end_date,
  rate_type, bill_rate, pay_rate, markup, currency,
  payment_terms, doc_id, status

invoices (TKG-INV-XXXX)
  client_id, agreement_id, jd_id, assignment_id,
  invoice_date, due_date, currency, tax_type, payment_terms,
  subtotal, tax_amount, grand_total, paid_amount, balance_due,
  status, pdf_storage_key,
  created_by, approved_by, sent_by, sent_at

invoice_items
  invoice_id, description, worker_id (candidate/deployed staff),
  quantity, rate, unit, tax_pct, discount, line_total

payments (TKG-PAY-XXXX)
  invoice_id, client_id, amount, payment_date,
  method, reference_no, receipt_doc_id, is_partial

credit_notes (TKG-CN-XXXX)
  original_invoice_id, reason, amount, approved_by, created_at

collection_followups
  invoice_id, client_id, followup_date, owner_id,
  remarks, next_action_date, status

client_billing_profiles
  client_id, billing_contact, payment_terms, tax_config,
  invoice_format, currency

finance_audit_logs
  invoice_id, action, old_value, new_value, actor_id, timestamp
```

---

## API Endpoints Required

```
GET  /api/finance/dashboard
GET/POST  /api/finance/invoices
GET/PUT   /api/finance/invoices/:id
PUT       /api/finance/invoices/:id/approve
PUT       /api/finance/invoices/:id/send
POST      /api/finance/invoices/:id/payments
GET       /api/finance/invoices/:id/payments
POST      /api/finance/invoices/:id/credit-notes
GET       /api/finance/clients/:id/ledger
GET/POST  /api/finance/agreements
GET       /api/finance/collection-followups
PUT       /api/finance/collection-followups/:id
GET       /api/finance/reports/revenue
GET       /api/finance/reports/aging
```

---

## Audit Log Events

- Invoice created / modified / approved / sent / paid / cancelled
- Payment received / receipt uploaded
- Credit note created
- Agreement created / modified / expired
- Commercial terms changed
- Collection follow-up added / updated
