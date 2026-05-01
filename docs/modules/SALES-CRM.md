# Sales CRM — Module Reference

**Project:** SRP AI Growth  
**Powered by:** SRP AI Labs  
**Status:** ✅ Core Done | 🔶 Enhancements In Progress  
**Last Updated:** April 2026

> **SRP unique advantage: AI-powered lead generation feeds directly into Sales CRM which feeds into Recruitment. One continuous pipeline.**

---

## 1. What Is Built Today

| Feature | DB Schema | Backend | Frontend | Status |
|---------|-----------|---------|---------|--------|
| Leads list | ✅ | ✅ | ✅ | **DONE** |
| Lead 360 | ✅ | ✅ | ✅ | **DONE** |
| Generate Leads (AI/Apollo/Apify/CSV) | ✅ | ✅ | ✅ | **DONE** |
| Lead ICP score (stored) | ✅ | ✅ | ✅ | **DONE** |
| Lead ICP score explanation panel | ✅ JSON | ✅ | ❌ UI panel | **Phase 01** |
| Lead → Client conversion flow | ✅ schema | partial | ❌ UI | **Phase 01** |
| Companies list | ✅ | ✅ | ✅ | **DONE** |
| Contacts | ✅ | ✅ | ✅ | **DONE** |
| Clients list | ✅ | ✅ | ✅ | **DONE** |
| Client 360 — Overview | ✅ | ✅ | ✅ | **DONE** |
| Client 360 — JDs tab | ✅ | ✅ | ✅ | **DONE** |
| Client 360 — Submissions tab | ✅ | ✅ | ✅ | **DONE** |
| Client 360 — Opportunities tab | ✅ | ✅ | ✅ | **DONE** |
| Client 360 — Notes tab | ✅ | ✅ | ✅ | **DONE** |
| Client 360 — Timeline tab | ✅ | ✅ | ✅ | **DONE** |
| Client 360 — Contacts tab | ✅ | ✅ | ❌ | **Phase 01** |
| Client 360 — Commercials tab | ✅ | partial | ❌ | **Phase 06** |
| Client 360 — Documents tab | ✅ | ✅ | ❌ | **Phase 01** |
| Client 360 — Top KPI cards | ❌ | partial | ❌ | **Phase 01** |
| Opportunities list | ✅ | ✅ | ✅ | **DONE** |
| Follow-ups list | ✅ | ✅ | ✅ | **DONE** |
| Proposals module | ✅ | ✅ | ❌ No page | **Phase 01** |
| Outreach sequences | ✅ | ✅ | ✅ | **DONE** |
| JD creation by Sales (with Client link) | ✅ | ✅ | partial | **Phase 02** |
| JD — Billing Rate / Pay Rate (commercial) | ✅ schema | ❌ RBAC | ❌ hidden | **Phase 02** |
| Sales Dashboard KPIs | partial | partial | partial | **Phase 01** |

---

## 2. Global ID Reference — Sales Entities

| Entity | ID Format | Stored As |
|--------|-----------|-----------|
| Lead | `SRP-LD-XXXX` | `lead.businessId` |
| Company | `SRP-COM-XXXX` | `company.businessId` |
| Client | `SRP-CL-XXXX` | `client.businessId` |
| Contact | `SRP-CNT-XXXX` | `contact.businessId` |
| Job / JD | `SRP-JD-XXXX` | `job.businessId` (shared with Recruitment) |
| Opportunity | `SRP-OPP-XXXX` | `opportunity.businessId` |
| Submission | `SRP-SUB-XXXX` | `submission.businessId` (shared with Recruitment) |
| Proposal | `SRP-PROP-XXXX` | `proposal.businessId` |
| Follow-up | `SRP-FU-XXXX` | `followUp.businessId` |

**Rules:**
- A JD must always link to a Client. `job.clientId` cannot be null for Sales-owned JDs.
- Lead conversion: `lead.convertedToClientId` stores the resulting Client ID.
- Company conversion: `company.isClient = true`, `company.clientId` set.

---

## 3. Sales CRM Sidebar Structure

```
SALES CRM
├── Leads
├── Generate Leads
├── Companies
├── Clients
├── Contacts
├── Opportunities
├── Follow Ups
├── Outreach
├── Proposals            ← Phase 01
└── Billing              ← Phase 06
```

---

## 4. Leads — List Page

**URL:** `/leads` | **Status:** ✅ Built

### Current Columns (All Built)

| Column | Notes |
|--------|-------|
| Lead ID (`businessId`) | Copy button |
| Lead Name | |
| Title | |
| Company | |
| Email | |
| Phone | |
| Country | |
| Industry | |
| Source | Apollo / Apify / Google Maps / Manual / CSV |
| ICP Score | Colour badge: 0–100 |
| Priority | High / Medium / Low |
| Stage | NEW → CLOSED_WON / CLOSED_LOST |
| Owner | `lead.assignedToId` |
| Last Contacted | Dual-format |
| Next Follow-up | |
| Created Date | |
| Actions | View, Score, Convert, Follow-up, Note |

### Lead Stages (Built)

```
New → Contacted → Qualified → Proposal → Negotiation → Closed Won / Closed Lost
```

### Lead 360 — Current Tabs (Built)

Overview · Company · Contacts · Emails · Notes · Follow-ups · Timeline

### ICP Score Panel — Phase 01

**What's there:** `lead.score` (0–100) + `lead.scoreDetails` JSON stored.  
**What's missing:** UI panel showing score breakdown.

| Breakdown Item | Status |
|---------------|--------|
| Company Fit | 🔲 |
| Title Fit | 🔲 |
| Industry Fit | 🔲 |
| Country Fit | 🔲 |
| Engagement Fit | 🔲 |
| Recommended Action | 🔲 |
| Score history trend | 🔲 |

---

## 5. Lead → Client Conversion Flow

**Schema:** `lead.convertedToClientId` (FK → Client), `lead.convertedAt`, `company.isClient`, `company.clientId`  
**What needs to be built — Phase 01:**

```
Lead 360 page
  ↓ "Convert to Client" button
  ↓ Pre-fill Client form from Lead + Company data
  ↓ Sales reviews / edits Client details
  ↓ Saves Client record (SRP-CL-XXXX created)
  ↓ lead.convertedToClientId = client.id
  ↓ lead.convertedAt = now()
  ↓ company.isClient = true
  ↓ Redirect to new Client 360
```

| Task | Status |
|------|--------|
| "Convert to Client" button on Lead 360 | 🔲 |
| Pre-fill Client form from Lead + Company | 🔲 |
| Persist conversion fields on Lead | 🔲 |
| Update Company flags | 🔲 |
| Redirect to Client 360 | 🔲 |

---

## 6. Companies — List Page

**URL:** `/companies` | **Status:** ✅ Built

Current: List view with basic columns. Company 360 accessible.

### Company Schema Fields

`businessId` · `name` · `website` · `industry` · `size` · `countryCode` · `city` · `techStack` · `painPoints` · `enrichedData` · `isClient` · `clientId`

---

## 7. Client Master

**URL:** `/clients` | **Status:** ✅ List + Create + 360 built (tabs partial)

### Client Fields (Schema)

| Field | Status |
|-------|--------|
| `businessId` — Display ID | ✅ |
| `name` | ✅ |
| `industry` | ✅ |
| `website` | ✅ |
| `countryCode` | ✅ |
| `state` | ✅ |
| `city` | ✅ |
| `address` | ✅ |
| `primaryContactId` | ✅ |
| `billingContactName` / `Email` | ✅ |
| `status` | ✅ ACTIVE / INACTIVE / PROSPECT / ON_HOLD / CLOSED |
| `salesOwnerId` | ✅ |
| `recruitmentManagerId` | ✅ |
| `paymentTerms` | ✅ |
| `submissionFormat` | ✅ |
| `requiredDocuments` | ✅ |
| `notes` | ✅ |
| `sourceLeadId` | ✅ (from conversion) |
| `sourceCompanyId` | ✅ (from conversion) |

### Client 360 — Tab Status

| Tab | Status |
|-----|--------|
| Overview | ✅ Built |
| JDs | ✅ Built |
| Submissions | ✅ Built |
| Opportunities | ✅ Built |
| Notes | ✅ Built |
| Timeline | ✅ Built |
| Contacts | ❌ Phase 01 |
| Commercials | ❌ Phase 06 |
| Documents | ❌ Phase 01 |

### Client 360 — Top KPI Cards (Phase 01)

```
[ Total JDs ] [ Open JDs ] [ CVs Submitted ] [ Interviews ] [ Offers ] [ Closures ] [ Pending Feedback ]
```

---

## 8. Contacts

**URL:** `/contacts` | **Status:** ✅ Built

### Contact Schema Fields

`businessId` · `companyId` · `firstName` · `lastName` · `email` · `phone` · `title` · `linkedinUrl` · `isDecisionMaker` · `enrichedData`

**Missing from Contact model:** `clientId` direct link, `contactType` (HR / Hiring Manager / Finance / Procurement), explicit `status` field.  
These will be added in Phase 01 when Client 360 Contacts tab is built.

---

## 9. Opportunities

**URL:** `/opportunities` | **Status:** ✅ List + New built

### Opportunity Stages (Built in Schema)

```
Discovery → Proposal → Negotiation → Verbal Commit → Closed Won → Closed Lost → On Hold
```

### Key Fields

`businessId` · `clientId` · `leadId` · `title` · `value` · `currency` · `stage` · `probability` · `expectedCloseDate` · `ownerId` · `lostReason`

---

## 10. Follow-ups

**URL:** `/follow-ups` | **Status:** ✅ List + New built

### Follow-up Types (Built)

Call · Email · Meeting · LinkedIn · WhatsApp · Other

### Follow-up Statuses (Built)

Pending · Done · Cancelled · Rescheduled

### Key Fields

`businessId` · `clientId` · `leadId` · `contactId` · `type` · `status` · `scheduledAt` · `completedAt` · `ownerId` · `reminderAt`

---

## 11. Proposals — Phase 01

**Status:** ✅ DB Schema ✅ Backend module | ❌ No frontend page yet

### Proposal Stages

```
Draft → Sent → Under Review → Accepted → Rejected → Revised
```

### Key Fields

`businessId` · `clientId` · `leadId` · `title` · `status` · `value` · `currency` · `validUntil` · `sentAt` · `acceptedAt` · `rejectedAt` · `fileUrl` · `ownerId`

### To Build — Phase 01

| Task | Status |
|------|--------|
| Proposals list page `/proposals` | 🔲 |
| New proposal form | 🔲 |
| Proposal detail/360 view | 🔲 |
| Status progression | 🔲 |
| Link proposal to Client 360 | 🔲 |

---

## 12. JD Creation — Sales Ownership

**URL:** `/jobs/new` | **Status:** Partial — form exists, Client link + commercial fields need phase work

### JD Fields — Sales Owns

| Field | Schema | Recruiter sees? |
|-------|--------|----------------|
| `clientId` (required) | ✅ | Display name only |
| `title` | ✅ | ✅ |
| `department` | ✅ | ✅ |
| `location` | ✅ | ✅ |
| `jobType` | ✅ | ✅ |
| `salaryMin / salaryMax` | ✅ | ✅ |
| `description` | ✅ | ✅ |
| `skills / requirements` | ✅ | ✅ |
| `priority` | ✅ | ✅ |
| `closingDate` | ✅ | ✅ |
| `visaRequirement` | ✅ | ✅ |
| `secondarySkills` | ✅ | ✅ |
| `targetSubmissionDate` | ✅ | ✅ |
| `jobReceivedDate` | ✅ | ✅ |
| **`billingRate`** | ✅ | ❌ hidden (Phase 06) |
| **`candidatePayRate`** | ✅ | ❌ hidden (Phase 06) |
| `recruitmentManagerId` | ✅ | ✅ (who manages them) |
| `assignedRecruiterId` | ✅ (single) | own record |
| `booleanSearch` | ✅ | ✅ (view only) |

### JD Phase Work

| Phase | Task |
|-------|------|
| Phase 02 | Require `clientId` on JD create form |
| Phase 02 | Multi-recruiter assignment (currently single `assignedRecruiterId`) |
| Phase 02 | Recruiter filtered JD list (only assigned JDs) |
| Phase 02 | JD status changes (Open/Hold/Close) — Sales only |
| Phase 02 | JD 360 new tabs: Submissions, Client Feedback, Recruiters, Boolean |
| Phase 06 | Strip `billingRate`, `candidatePayRate` from Recruiter API responses |

---

## 13. Outreach

**URL:** `/outreach` | **Status:** ✅ Built

Outreach sequences with AI-drafted messages. All sends require user confirmation — no auto-send.

### Outreach Statuses (Built)

```
Draft → Pending Approval → Approved → Sent → Replied → Bounced → Suppressed
```

---

## 14. Role Permissions — Sales CRM

| Action | Super Admin | Management | Sales Manager | Sales Executive | Recruiter |
|--------|:-----------:|:----------:|:-------------:|:---------------:|:---------:|
| Create / edit Lead | ✅ | ✅ | ✅ team | ✅ own | ❌ |
| Score Lead (AI) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Convert Lead → Client | ✅ | ✅ | ✅ | ✅ own | ❌ |
| Create / edit Client | ✅ | ✅ | ✅ own | ✅ own | ❌ |
| View Client Commercials | ✅ | ✅ | ✅ | 🔵 own | ❌ |
| Create JD under Client | ✅ | ✅ | ✅ | ✅ | ❌ |
| Assign Recruiters to JD | ✅ | ✅ | ✅ | ✅ | ❌ |
| View JD | ✅ all | ✅ all | ✅ own | 🔵 own | 🔵 assigned |
| View Submissions | ✅ all | ✅ all | ✅ own | 🔵 own | 🔵 own |
| Edit Client Feedback on Submission | ✅ | ✅ | ✅ | ✅ own | ❌ |
| Create Opportunity | ✅ | ✅ | ✅ | ✅ own | ❌ |
| Create Proposal | ✅ | ✅ | ✅ | ✅ own | ❌ |
| Send Outreach (after AI draft) | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Billing | ✅ | ✅ | 🔵 view only | ❌ | ❌ |
| Export Data | ✅ | ✅ | ✅ | ❌ | ❌ |

> 🔵 = filtered access (own records / clients)  
> All API-level RBAC enforcement in Phase 06.

---

## 15. Audit Events — Sales CRM

| Event | Trigger |
|-------|---------|
| `lead.created` | New lead (import or manual) |
| `lead.stage_changed` | Stage updated |
| `lead.scored` | AI ICP score computed |
| `lead.converted` | Converted to Client |
| `company.created` | New company |
| `client.created` | New client |
| `client.updated` | Fields changed |
| `contact.created` | New contact |
| `jd.created` | Sales creates JD |
| `jd.assigned` | Recruiters assigned |
| `jd.status_changed` | Open / Hold / Close |
| `opportunity.created` | New opportunity |
| `opportunity.stage_changed` | Stage changed |
| `proposal.sent` | Proposal dispatched |
| `outreach.approved_sent` | User confirms send |
| `submission.feedback_added` | Client feedback entered |
| `followup.created` | Follow-up scheduled |

---

## 16. Phase Summary for Sales CRM

| Phase | Work | Priority |
|-------|------|---------|
| Phase 01 | Lead ICP score explanation panel | HIGH |
| Phase 01 | Lead → Client conversion UI | HIGH |
| Phase 01 | Client 360 — Contacts tab | HIGH |
| Phase 01 | Client 360 — Documents tab | MEDIUM |
| Phase 01 | Client 360 — Top KPI cards | MEDIUM |
| Phase 01 | Proposals module frontend | MEDIUM |
| Phase 02 | JD require Client link on create | HIGH |
| Phase 02 | Multi-recruiter assignment to JD | HIGH |
| Phase 02 | JD 360 — Submissions tab | HIGH |
| Phase 02 | JD 360 — Client Feedback tab | HIGH |
| Phase 02 | JD 360 — Boolean Search modal | MEDIUM |
| Phase 06 | Client 360 — Commercials tab (RBAC) | HIGH |
| Phase 06 | Strip commercial fields from Recruiter API | HIGH |

---

## 17. Related Documents

| Document | Description |
|----------|-------------|
| [RECRUITMENT.md](RECRUITMENT.md) | Recruitment ATS module |
| [SALES-RECRUITMENT-INTEGRATION.md](SALES-RECRUITMENT-INTEGRATION.md) | Integration + data flow |
| [../ROADMAP.md](../ROADMAP.md) | Phase-wise build plan |
