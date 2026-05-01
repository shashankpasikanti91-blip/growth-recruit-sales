# SRP AI Growth — Platform Roles & Access Structure

**Project:** SRP AI Growth  
**Live Platform:** https://growth.srpailabs.com/  
**Powered by:** SRP AI Labs  
**Last Updated:** April 2026

> This document describes SRP's own role hierarchy, tenant structure, and page access control.  
> This is NOT copied from any other system — it is built specifically for how SRP AI Growth operates.

---

## Platform Architecture (3 Levels)

```
┌─────────────────────────────────────────────────────────┐
│  LEVEL 1 — SRP AI Labs (Platform Owner)                 │
│  Role: SUPER_ADMIN                                      │
│  Scope: ALL tenants, ALL data, platform health          │
│  Access: /owner — full control panel                    │
└────────────────────────┬────────────────────────────────┘
                         │  1 platform owns N tenants
┌────────────────────────▼────────────────────────────────┐
│  LEVEL 2 — Tenant (One Company Workspace)               │
│  Example: "Growth Staffing Pte Ltd" on SRP              │
│  Has: own users, own data, own plan, own slug           │
│  Identifies by: tenantId (UUID) + slug (login URL)      │
└────────────────────────┬────────────────────────────────┘
                         │  1 tenant owns N users
┌────────────────────────▼────────────────────────────────┐
│  LEVEL 3 — User (Team Member within a Tenant)           │
│  Roles: TENANT_ADMIN / SALES / RECRUITER / VIEWER       │
│  ID: SRP-USR-XXXX (businessId on User model)            │
└─────────────────────────────────────────────────────────┘
```

---

## Level 1 — Platform Level: SUPER_ADMIN

**Who:** SRP AI Labs owner / platform operator only.  
**How many:** Typically 1–3 people maximum.  
**What they can do:**

| Capability | Access |
|------------|--------|
| View all registered tenants | `/owner` → Tenants tab |
| See tenant status (Active, Trial, Cancelled) | `/owner` → Subscriptions tab |
| Monitor AI usage across all tenants | `/owner` → AI Stats tab |
| View new signups by date range | `/owner` → Signups tab |
| Platform-wide health overview (total users, total tenants, total AI calls) | `/owner` → Overview tab |
| Access any tenant's data | Superadmin API layer |
| Manage subscription plans globally | Owner API |

**Sidebar extras visible only to SUPER_ADMIN:**
- `Owner Control Panel` → `/owner`

**SUPER_ADMIN cannot be assigned by any other user.** Only the initial seed or a direct DB update can set this role.

---

## Level 2 — Tenant (Workspace)

**What is a Tenant?**  
A Tenant is one company (or one team) that has registered and logs in to SRP AI Growth.  
Every piece of data in the system — leads, candidates, jobs, clients — belongs to exactly one tenant.  
There is **no cross-tenant visibility at any level** (except SUPER_ADMIN via the Owner panel).

**Tenant Fields (from schema):**

| Field | What it means |
|-------|--------------|
| `tenantId` | Unique UUID — joins every table in the system |
| `slug` | URL-friendly identifier for the tenant (internal reference, not a subdomain) |
| `name` | Display name of the company |
| `plan` | Subscription tier: FREE / STARTER / GROWTH / PROFESSIONAL / ENTERPRISE |
| `countryCode` | Default country (e.g. `MY`, `GB`, `AE`) |
| `timezone` | Default timezone for date display |
| `currency` | Default currency (e.g. `MYR`, `GBP`, `USD`) |

**Subscription Plans (controls platform limits):**

| Plan | Typical Limits |
|------|---------------|
| FREE | 1–3 users, limited AI calls, limited records |
| STARTER | Small team, moderate AI usage |
| GROWTH | Growth team, more AI calls, more records |
| PROFESSIONAL | Full platform, high AI usage |
| ENTERPRISE | Unlimited users, unlimited AI, custom limits |

Plan limits are enforced via `billingApi` + `tenantUsageApi`. Usage meters visible in `/billing`.

---

## Level 3 — User Roles within a Tenant

### Role Summary

| Role | Who Is This | Access Level |
|------|------------|-------------|
| `SUPER_ADMIN` | SRP AI Labs platform operator | Everything + all tenants |
| `TENANT_ADMIN` | Company admin / IT admin | Everything within their own tenant |
| `SALES` | Sales representative, BD Manager, Account Manager | Sales CRM (full) + shared dashboard |
| `RECRUITER` | Recruiter, Sourcing Specialist, Talent Acquisition | Recruitment ATS (full) + shared dashboard |
| `VIEWER` | Read-only observer, client stakeholder | Dashboard + analytics (read-only) |

---

## Page Access Matrix

### Full Platform Page List

| Page | Path | SUPER_ADMIN | TENANT_ADMIN | SALES | RECRUITER | VIEWER |
|------|------|:-----------:|:------------:|:-----:|:---------:|:------:|
| Dashboard | `/dashboard` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Analytics | `/analytics` | ✅ | ✅ | ✅ | ✅ | ✅ |
| — | — | — | — | — | — | — |
| **SALES CRM** | | | | | | |
| Leads | `/leads` | ✅ | ✅ | ✅ | ❌ | 👁️ |
| Generate Leads | `/leads/generate` | ✅ | ✅ | ✅ | ❌ | ❌ |
| Lead 360 | `/leads/[id]` | ✅ | ✅ | ✅ | ❌ | 👁️ |
| Companies | `/companies` | ✅ | ✅ | ✅ | 👁️ | 👁️ |
| Contacts | `/contacts` | ✅ | ✅ | ✅ | 👁️ | 👁️ |
| Clients | `/clients` | ✅ | ✅ | ✅ | ✅ | 👁️ |
| Client 360 | `/clients/[id]` | ✅ | ✅ | ✅ | ✅ | 👁️ |
| Opportunities | `/opportunities` | ✅ | ✅ | ✅ | ❌ | 👁️ |
| Follow-ups | `/follow-ups` | ✅ | ✅ | ✅ | 👁️ | 👁️ |
| Outreach | `/outreach` | ✅ | ✅ | ✅ | 👁️ | ❌ |
| Proposals | `/proposals` | ✅ | ✅ | ✅ | ❌ | 👁️ |
| — | — | — | — | — | — | — |
| **RECRUITMENT ATS** | | | | | | |
| Candidates | `/candidates` | ✅ | ✅ | 👁️ | ✅ | 👁️ |
| Candidate 360 | `/candidates/[id]` | ✅ | ✅ | 👁️ | ✅ | 👁️ |
| Jobs / JDs | `/jobs` | ✅ | ✅ | ✅ | ✅ | 👁️ |
| JD 360 | `/jobs/[id]` | ✅ | ✅ | ✅ | ✅ | 👁️ |
| Applications | `/applications` | ✅ | ✅ | 👁️ | ✅ | 👁️ |
| Submissions | `/submissions` | ✅ | ✅ | ✅ | ✅ | 👁️ |
| AI Match / Screen | `/ai/screen` | ✅ | ✅ | ❌ | ✅ | ❌ |
| — | — | — | — | — | — | — |
| **OPERATIONS** | | | | | | |
| Documents | `/documents` | ✅ | ✅ | ✅ | ✅ | 👁️ |
| Imports | `/imports` | ✅ | ✅ | ✅ | ✅ | ❌ |
| Workflows | `/workflows` | ✅ | ✅ | ❌ | ❌ | ❌ |
| Integrations | `/integrations` | ✅ | ✅ | ❌ | ❌ | ❌ |
| Visa Guide | `/visa-guide` | ✅ | ✅ | ✅ | ✅ | 👁️ |
| — | — | — | — | — | — | — |
| **SETTINGS (Admin only)** | | | | | | |
| Billing | `/billing` | ✅ | ✅ | ❌ | ❌ | ❌ |
| Users & Roles | `/users` | ✅ | ✅ | ❌ | ❌ | ❌ |
| Audit Logs | `/audit` | ✅ | ✅ | ❌ | ❌ | ❌ |
| Settings | `/settings` | ✅ | ✅ | 👁️ | 👁️ | 👁️ |
| — | — | — | — | — | — | — |
| **PLATFORM OWNER** | | | | | | |
| Owner Control Panel | `/owner` | ✅ | ❌ | ❌ | ❌ | ❌ |

**Key:** ✅ Full access · 👁️ Read-only · ❌ No access

> **Note:** The access matrix above reflects the INTENDED design. Roles are partially enforced in the sidebar today. Full API-level enforcement is Phase 06 (SRP Commercial Firewall).

---

## What Each Role Sees in the Sidebar

### SUPER_ADMIN Sidebar
```
Dashboard
▼ Sales CRM        (all items)
▼ Recruitment      (all items)
▼ Operations       (all items)
▼ Settings
   Billing
   Users & Roles
   Audit Logs
   Settings
   Visa Guide
▼ Owner
   Owner Control Panel     ← SUPER_ADMIN only
```

### TENANT_ADMIN Sidebar
```
Dashboard
▼ Sales CRM        (all items)
▼ Recruitment      (all items)
▼ Operations       (all items)
▼ Settings
   Billing
   Users & Roles
   Audit Logs
   Settings
   Visa Guide
```

### SALES Role Sidebar
```
Dashboard
▼ Sales CRM
   Leads · Generate Leads · Companies · Clients
   Contacts · Opportunities · Follow-ups · Outreach · Proposals
▼ Recruitment
   Jobs/JDs · Submissions          ← Sales sees JDs + submissions (client context)
▼ Operations
   Analytics · Documents · Imports
▼ Settings
   Settings · Visa Guide
```

### RECRUITER Role Sidebar
```
Dashboard
▼ Sales CRM
   Clients         ← Recruiter can see Clients (who they work for)
▼ Recruitment
   Candidates · Jobs/JDs · Applications · Submissions · AI Match Analysis
▼ Operations
   Analytics · Documents · Imports
▼ Settings
   Settings · Visa Guide
```

### VIEWER Role Sidebar
```
Dashboard
Analytics
Settings
```

---

## Tenant Onboarding Flow

When a new company signs up:

```
1. Company registers → POST /api/v1/auth/signup
   → Tenant record created
   → First user created with role = TENANT_ADMIN
   → Tenant slug derived from company name
   → Default plan = FREE
   → TenantOnboarding record created (tracks setup steps)

2. Admin logs in → sees onboarding checklist
   [ ] Add team members
   [ ] Configure integration (Apollo, SMTP, etc.)
   [ ] Import first candidates or leads
   [ ] Create first Job or Lead

3. Admin invites team → POST /api/v1/team/invite
   → TenantInvite record created
   → Invite email sent
   → User clicks link → sets password → role assigned by admin

4. Admin manages team at /users
   → Change roles (SALES ↔ RECRUITER ↔ VIEWER)
   → Deactivate users
   → Check seat usage against plan limit
```

---

## User Identity Fields

Every user has:

| Field | Description | Example |
|-------|-------------|---------|
| `businessId` | Display ID | `SRP-USR-0042` |
| `id` | Internal UUID | `uuid-...` |
| `tenantId` | Which workspace they belong to | `uuid-...` |
| `email` | Login email (unique per tenant) | `ali@company.com` |
| `role` | Their access level | `RECRUITER` |
| `firstName` + `lastName` | Display name | `Ali` `Hassan` |
| `isActive` | Can they log in | `true / false` |
| `lastLoginAt` | Last seen | timestamp |

---

## Commercial Boundary (Critical — Phase 06 will enforce this at API level)

| Field | Who Can See It |
|-------|---------------|
| `billingRate` (on Job) | SUPER_ADMIN, TENANT_ADMIN, SALES |
| `candidatePayRate` (on Job) | SUPER_ADMIN, TENANT_ADMIN, SALES |
| `paymentTerms` (on Client) | SUPER_ADMIN, TENANT_ADMIN, SALES |
| `markup` / `invoiceAmount` | SUPER_ADMIN, TENANT_ADMIN |
| `salary` / `bank details` | Future — no fields yet |

**RECRUITER must NEVER receive these fields in any API response.** Today this is UI-only enforcement. Phase 06 adds the API guard.

---

## Audit Trail

Every significant action writes to `AuditLog`:

| Who Created It | Action | Entity | Visible At |
|---------------|--------|--------|-----------|
| Any user | CREATE, UPDATE, DELETE | Any entity | `/audit` (Admin only) |
| Any user | STAGE_CHANGED | Candidate, Lead, Submission | `/audit` |
| Any user | AI_SCREENED | Candidate, Lead | `/audit` |
| Any user | IMPORT_UPLOAD, IMPORT_COMMIT | SourceImport | `/audit` |
| System | WORKFLOW_PAUSE, RETRY | WorkflowRun | `/workflows` |
| Any user | LOGIN, LOGOUT | User | `/audit` |

Audit logs are **read-only** — never editable, never deletable by any role including SUPER_ADMIN.

---

## ID Reference by Entity

| Entity | Display ID Format | DB Field |
|--------|------------------|----------|
| User | `SRP-USR-XXXX` | `users.businessId` |
| Candidate | `SRP-CAN-XXXX` | `candidates.businessId` |
| Job / JD | `SRP-JD-XXXX` | `jobs.businessId` |
| Lead | `SRP-LD-XXXX` | `leads.businessId` |
| Company | `SRP-CO-XXXX` | `companies.businessId` |
| Contact | `SRP-CT-XXXX` | `contacts.businessId` |
| Client | `SRP-CL-XXXX` | `clients.businessId` |
| Application | `SRP-APP-XXXX` | `applications.businessId` |
| Submission | `SRP-SUB-XXXX` | `submissions.businessId` |
| Opportunity | `SRP-OPP-XXXX` | `opportunities.businessId` |
| Proposal | `SRP-PRO-XXXX` | `proposals.businessId` |
| Document | `SRP-DOC-XXXX` | `documents.businessId` |

> IDs are permanent and never change, even if the record is updated.  
> IDs are the link key — no record is ever joined by name or email.
