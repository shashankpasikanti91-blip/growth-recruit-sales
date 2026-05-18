# Phase 02 — Sales CRM + Recruitment Connection

**Status:** 🔲 Not Started  
**Priority:** HIGH  
**Depends on:** Phase 00 (done), Phase 01 (My Workspace)

---

## Goal

Sales team owns clients, contacts, JDs, agreements, and commercial terms.  
Recruitment works only on **assigned JDs** — they cannot see billing rates, payment terms, or commercial fields.  
When candidates are submitted, the submission record connects Sales ↔ Recruitment automatically using IDs.

---

## Module Structure

### Sales Dashboard `/sales`
**KPIs:**
- Total Clients
- Active Clients
- New Clients This Month
- Open JDs
- JDs Assigned to Recruitment
- CVs Submitted
- Interviews Scheduled
- Offers / Closures
- Pending Client Follow-ups
- Pending Invoices
- Collection Follow-ups
- Estimated Revenue / Closed Revenue

---

## Phase 2.1 — Client Master

**ID:** `TKG-CL-0001`

**Client Fields:**
| Field | Notes |
|-------|-------|
| Client ID | Auto-generated TKG-CL-XXXX |
| Client Name | |
| Business Unit | |
| Industry | |
| Website | |
| Country | |
| State | |
| City | |
| Address | |
| Primary Contact Name | |
| Primary Contact Email | |
| Primary Contact Phone | |
| Billing Contact | |
| Client Status | Active / On Hold / Inactive |
| Client Owner / Sales Owner | |
| Recruitment Manager | |
| Default Recruiters | multi-select |
| Payment Terms | e.g., 30 days, 60 days |
| Submission Format | |
| Required Documents | |
| Notes | |
| Created By | |
| Created Date | |
| Updated Date | |

**Client 360 Page Tabs:**
1. Overview
2. Contacts
3. Job Requirements
4. Submissions
5. Documents
6. Commercials *(Sales, Finance, Admin only)*
7. Notes
8. Activity Timeline

**Client 360 Top Cards:**
- Total JDs | Open JDs | CVs Submitted | Interviews | Offers | Closures | Pending Feedback

---

## Phase 2.2 — Client Contacts

**ID:** `TKG-CNT-0001`

| Field | Notes |
|-------|-------|
| Contact ID | TKG-CNT-XXXX |
| Client ID | FK to Client |
| Contact Name | |
| Designation | |
| Department | |
| Email | |
| Phone | |
| LinkedIn URL | |
| Contact Type | HR / Hiring Manager / Finance / Procurement / Other |
| Status | Active / Inactive |
| Notes | |

Rules:
- Contacts must be linked to a client
- Email/meeting history visible under both Client 360 and Contact profile

---

## Phase 2.3 — Job Requirements / JD Ownership

**ID:** `TKG-JD-0001`

| Field | Notes |
|-------|-------|
| JD ID | TKG-JD-XXXX |
| Client ID | FK to Client |
| Client Name | Display only |
| Job Title | |
| Department | |
| Location | |
| Country | |
| Employment Type | Permanent / Contract / Freelance |
| Contract Duration | |
| Required Experience Min / Max | |
| Salary Min / Max | |
| Currency | |
| Billing Rate / Client Rate | **Sales + Finance + Admin only** |
| Pay Rate / Candidate Rate | **Sales + Finance + Admin only** |
| Priority | High / Medium / Low |
| Number of Positions | |
| Target Submission Date | |
| Job Received Date | |
| Job Status | Open / On Hold / Closed / Cancelled |
| Required Skills | |
| Secondary Skills | |
| Work Authorization / Visa | |
| Job Description | |
| Boolean Search | Auto-generated helper |
| Assigned Recruitment Manager | |
| Assigned Recruiters | |
| Created By | |
| Created Date | |
| Updated Date | |

**JD 360 Page Tabs:**
1. Overview
2. Job Description
3. Assigned Recruiters
4. Candidates
5. Submissions
6. Client Feedback
7. Timeline
8. Commercials *(Sales, Finance, Admin only — billing rate, markup, payment terms)*
9. Documents

**JD 360 Top Cards:**
- Open Positions | Submitted CVs | Screened Candidates | Interviews | Offers | Days Open | Target Submission Date

**Rules:**
- Sales creates and owns JDs
- Recruiters can view JD and tag/submit candidates
- Recruiters **cannot** edit: Client Name, Billing Rate, Payment Terms, commercial fields
- One JD can have many submissions
- One client can have many JDs

---

## Phase 2.4 — Sales to Recruitment Flow

```
Sales creates Client (TKG-CL-XXXX)
  → Sales creates JD under Client (TKG-JD-XXXX)
    → Sales assigns Recruitment Manager / Recruiters
      → JD appears in Recruiter's Job Openings (read-only commercial fields)
        → Recruiter uploads/tags Candidate (TKG-CAN-XXXX)
          → Recruiter submits Candidate to JD
            → Submission record created (TKG-SUB-XXXX)
              → Sales validates (optional) → Client submission
                → Client Feedback → Interview → Offer → Joined
```

**Recruiter side:**
- Can view assigned JDs
- Can submit candidates to JD
- Can update recruitment stage
- Cannot edit commercial/client fields

**Sales side:**
- Can see all submissions for their clients/JDs
- Can see recruiter activity and candidate count
- Can update client feedback
- Can communicate follow-up status

---

## Phase 2.5 — Submissions Tracking

**ID:** `TKG-SUB-0001`

| Field | Notes |
|-------|-------|
| Submission ID | TKG-SUB-XXXX |
| Client ID | |
| Client Name | |
| JD ID | |
| Job Title | |
| Candidate ID | TKG-CAN-XXXX |
| Candidate Name | |
| Recruiter | |
| Sales Owner | |
| Submitted Date | |
| Current Stage | |
| AI Match Score | |
| Resume Link | Private signed URL |
| Client Feedback | |
| Interview Date | |
| Offer Status | |
| Rejection Reason | |
| Last Updated | |

**Submission Stages:**
`Draft → Submitted to Sales → Submitted to Client → Client Review → Interview → Offer → Joined → Rejected`

---

## Phase 2.6 — Client Documents

**Document Types:**
MSA, NDA, LOA, MOU, Contract Copy, SOW, Rate Card, Client Submission Format

| Field | Notes |
|-------|-------|
| Document ID | TKG-DOC-XXXX |
| Client ID | FK |
| Document Type | |
| Title | |
| File | Private storage |
| Uploaded By | |
| Uploaded Date | |
| Expiry Date | |
| Notes | |

Access: Sales owner, Manager, Admin — Recruiters get submission documents only if permitted

---

## Phase 2.7 — Billing / Commercials

Simple commercial tracking. Visible to Sales, Management, Admin, Finance only.

| Field | |
|-------|-|
| Client Bill Rate | |
| Candidate Pay Rate | |
| Currency | |
| Rate Type | Monthly / Hourly / Daily / Full Time |
| Markup Type | Flat / Percentage |
| Markup Value | |
| Payment Terms | |
| Replacement Period | |
| Invoice Status | |

**Calculated:** Margin, Estimated Revenue, Average/Min/Max Salary

---

## Phase 2.8 — Permissions / Hierarchy

| Role | Clients | JDs | Commercial Fields | Submissions | Documents |
|------|---------|-----|------------------|-------------|-----------|
| Super Admin | Full | Full | ✅ | Full | Full |
| Management | View | View | ✅ | View | View |
| Sales Manager | Own team | Own team | ✅ | Own team | Own team |
| Sales Executive | Assigned | Assigned | ✅ | Assigned | Assigned |
| Recruitment Manager | No | Assigned only | ❌ | ✅ | Submission docs only |
| Recruiter | No | Assigned only | ❌ | Own submissions | Submission docs only |
| Finance | No | View | ✅ | No | Agreements/invoices |
| HR Admin | No | No | ❌ | No | No |

---

## DB Tables Required

```
clients               (TKG-CL-XXXX)
client_contacts       (TKG-CNT-XXXX)
jobs                  (TKG-JD-XXXX) — extend existing jobs table
  + client_id, billing_rate, pay_rate, markup, payment_terms
submissions           (TKG-SUB-XXXX)
  candidate_id, job_id, client_id, recruiter_id, sales_owner_id,
  stage, ai_score, client_feedback, offer_status, rejection_reason
client_documents      (TKG-DOC-XXXX, owner_type='CLIENT', owner_id=TKG-CL-XXXX)
client_commercials    (linked to client_id and job_id)
sales_follow_ups      (linked to client_id, contact_id, sales owner)
```

---

## UI Pages Required

- `/sales` — Sales Dashboard
- `/sales/clients` — Client list
- `/sales/clients/new` — Create client
- `/sales/clients/:id` — Client 360 (tabs: Overview, Contacts, JDs, Submissions, Documents, Commercials, Notes, Activity)
- `/sales/contacts` — All contacts
- `/sales/jobs` — JD list
- `/sales/jobs/new` — Create JD
- `/sales/jobs/:id` — JD 360
- `/sales/submissions` — Submissions board
- `/sales/followups` — Sales follow-ups
- `/sales/documents` — Client documents

---

## API Endpoints Required

```
GET/POST /api/sales/clients
GET/PUT/DELETE /api/sales/clients/:id
GET/POST /api/sales/clients/:id/contacts
GET/POST /api/sales/jobs
GET/PUT /api/sales/jobs/:id
POST /api/sales/jobs/:id/assign-recruiters
GET /api/sales/submissions
GET /api/sales/submissions/:id
PUT /api/sales/submissions/:id/stage
GET /api/sales/clients/:id/documents
POST /api/sales/clients/:id/documents
GET /api/sales/clients/:id/commercials      ← Sales/Finance/Admin only
PUT /api/sales/clients/:id/commercials
```

---

## Audit Log Events

- Client created / updated / status changed
- JD created / updated / assigned to recruiter / status changed
- Candidate submitted to JD (Submission created)
- Submission stage changed
- Client feedback updated
- Document uploaded
- Commercial terms updated
