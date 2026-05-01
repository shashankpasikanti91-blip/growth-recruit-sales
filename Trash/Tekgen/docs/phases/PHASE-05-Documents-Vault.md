# Phase 05 — Documents Vault

**Status:** 🔲 Not Started  
**Depends on:** Phase 01 (Employee IDs), Phase 02 (Client IDs), Phase 04 (Visa Case IDs)

---

## Goal

All uploaded files across every module are stored in one **secure, private document vault**.  
No public file URLs. Documents are linked by owner type + owner ID.  
Every download and view is audit-logged.

---

## Core Principle

Every document belongs to an **owner**:

| Owner Type | Owner ID | Example Documents |
|-----------|---------|------------------|
| `EMPLOYEE` | TKG-EMP-XXXX | Resume, IC/passport, offer letter, education docs, bank letter, tax docs, policies signed |
| `CANDIDATE` | TKG-CAN-XXXX | Resume, screening docs, interview notes, offer documents |
| `CLIENT` | TKG-CL-XXXX | MSA, NDA, SOW, rate card, agreement, client submission format |
| `JD` | TKG-JD-XXXX | JD document, client brief |
| `INVOICE` | TKG-INV-XXXX | Invoice PDF, receipt, payment proof, credit note |
| `AGREEMENT` | TKG-AGR-XXXX | Signed contracts, rate cards, amendments |
| `VISA_CASE` | TKG-VISA-XXXX | Passport, permit letter, medical docs, expiry docs, approvals |
| `COMPANY` | company | Policies, templates, user guides, statutory templates |

---

## Document Fields

| Field | Notes |
|-------|-------|
| Document ID | TKG-DOC-XXXX |
| Owner Type | EMPLOYEE / CANDIDATE / CLIENT / JD / INVOICE / AGREEMENT / VISA_CASE / COMPANY |
| Owner ID | FK to the related entity |
| Document Type | e.g., Resume, NRIC, Offer Letter, Invoice PDF, MSA, Passport, etc. |
| File Name | Original filename |
| Storage Key | Internal private storage reference (never shown as public URL) |
| File Size | |
| File Type | PDF / JPG / PNG / DOCX — validated |
| Uploaded By | User ID |
| Uploaded Date | |
| Expiry Date | For passports, visas, contracts, permits, agreements |
| Verification Status | Pending / Approved / Rejected |
| Verified By | |
| Verified Date | |
| Access Level | Private / HR Only / Finance Only / All with permission |
| Status | Missing / Uploaded / Under Review / Approved / Rejected / Expired / Renewal Required |
| Notes | |
| Audit Log | Every view, download, upload, verify, delete action logged |

---

## Document Statuses

| Status | Meaning |
|--------|---------|
| Missing | Required but not yet uploaded |
| Uploaded | File present, not yet reviewed |
| Under Review | HR/Admin/Visa reviewing |
| Approved | Verified and accepted |
| Rejected | Failed verification (wrong doc, expired, etc.) |
| Expired | Past expiry date |
| Renewal Required | Expiry approaching, renewal needed |

---

## Security Rules

| Rule | |
|------|-|
| No public URLs | Files must never have permanent accessible public links |
| Signed URL expiry | Every download/view generates a time-limited signed URL (15–30 min) |
| File type validation | Only allowed types: PDF, JPG, JPEG, PNG, DOCX — server-side validation |
| File size limit | e.g., max 10MB — configurable |
| No PII in logs | File paths, passport numbers, bank details must never appear in server logs |
| Role-based access | Only users with permission to the owner entity can access its documents |
| Audit every action | Upload, view, download, approve, reject, delete — all logged with user + timestamp |
| No accidental delete | Soft delete only — mark as archived, not permanent delete |

---

## Expiry Tracking & Reminders

Documents with an expiry date must trigger alerts:
- 90 days before expiry: first reminder
- 60 days before expiry: second reminder
- 30 days before expiry: urgent alert
- On expiry: status auto-changes to `Expired`, notifications sent

---

## Document Checklist by Worker Type

The system must show a **required document checklist** per employee/candidate based on their worker category:

| Worker Type | Required Documents |
|-------------|-------------------|
| Malaysia Local Employee | NRIC, EPF card, SOCSO, Tax Number, Bank letter, Offer letter, Employment agreement |
| Expat in Malaysia | Passport, Work permit, Tax number, Bank account, Offer letter, Employment agreement |
| Expat Overseas Hire | Passport, Photo, Medical cert, Education certificates, Experience letters, Signed offer, Post-arrival bank/tax docs |
| Contractor | Contract, Tax docs, Bank details |
| Client-Deployed Staff | Assignment agreement, Offer letter, Permit (if expat) |

Checklist shows: ✅ Uploaded & Approved, ⚠️ Pending Review, ❌ Missing, 🔄 Expired

---

## DB Table

```
documents (TKG-DOC-XXXX)
  id              (TKG-DOC-XXXX)
  owner_type      (EMPLOYEE / CANDIDATE / CLIENT / INVOICE / VISA_CASE / etc.)
  owner_id        (FK to the related entity)
  document_type   (Resume / NRIC / Passport / Invoice PDF / etc.)
  file_name
  storage_key     (internal reference — never expose as public URL)
  file_size
  file_type
  uploaded_by
  uploaded_at
  expiry_date
  verification_status (Pending / Approved / Rejected)
  verified_by
  verified_at
  access_level    (Private / HR / Finance / All)
  status          (Missing / Uploaded / Under Review / Approved / Rejected / Expired / Renewal Required)
  notes
  is_deleted      (soft delete flag)
  deleted_by
  deleted_at
  created_at, updated_at

document_audit_logs
  document_id, action (Upload / View / Download / Approve / Reject / Delete),
  performed_by, performed_at, ip_address, user_agent
```

---

## UI Components Required

- Document upload widget (used across all modules: Candidate 360, Employee 360, Client 360, Visa Case, Invoice)
- Document list with status badges
- Document preview (PDF viewer / image — via signed URL, expires in 15 min)
- Expiry alert banner
- Document checklist widget (shows required vs. uploaded)
- Admin verification panel: Approve / Reject with comment

---

## API Endpoints Required

```
POST /api/documents/upload              — Upload file (returns Document ID, no public URL)
GET  /api/documents/:id/download        — Returns a signed URL (expiry: 15 min)
GET  /api/documents?ownerType=&ownerId= — List documents for an entity
PUT  /api/documents/:id/verify          — Approve or reject (HR/Admin only)
DELETE /api/documents/:id               — Soft delete (HR/Admin only, audit logged)
GET  /api/documents/checklist/:employeeId — Checklist status for employee
GET  /api/documents/expiring            — Docs expiring within N days (HR/Visa/Admin)
```

---

## Audit Log Events

- Document uploaded (who, what, for which entity)
- Document viewed / downloaded (who, when, which IP)
- Document approved / rejected
- Document deleted (soft delete — reason required)
- Expiry alert triggered
