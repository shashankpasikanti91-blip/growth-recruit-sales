# SRP AI Growth — How to Build: Start Here

**Project:** SRP AI Growth  
**Powered by:** SRP AI Labs  
**Status as of:** April 2026  
**READ THIS BEFORE TOUCHING ANY CODE**

---

## Before You Begin — Non-Negotiable Rules

These rules apply to every single task, every single day, for every developer working on SRP AI Growth.

### Rule 1 — Backup First, Always

> **You will NOT write a single line of code until the backup is confirmed.**

Before every coding session (not per feature — per session, every day):

```
Step 1: Take local backup
Step 2: Confirm backup file exists and size > 0
Step 3: Copy backup to Google Drive / external drive (manual or script)
Step 4: THEN start coding
```

**Script to run (local machine or server):**
```bash
./scripts/backup-db.sh production
```
Output: `backups/srp_production_YYYYMMDD_HHMMSS.sql.gz`

**On the server side** — the server must have its own backup before any deploy:
```bash
# SSH into server, then:
./scripts/pre-deploy.sh production
```
`pre-deploy.sh` runs: backup → migration → build. Never skip it.

**Rollback in an emergency:**
```bash
./scripts/rollback.sh backups/srp_production_YYYYMMDD_HHMMSS.sql.gz
```

**Verify system is OK after any change:**
```bash
./scripts/verify-health.sh
```

---

### Rule 2 — No Wipe Code

> **Never delete. Always extend.**

| ❌ Forbidden | ✅ Correct |
|-------------|-----------|
| Delete an existing API route | Add a new route alongside it |
| Remove a Prisma model field | Add the new field; never drop existing ones |
| Overwrite a working page | Add new tabs / sections to the existing page |
| `DROP TABLE` in any migration | Only `ADD COLUMN`, `CREATE TABLE`, `CREATE INDEX` |
| `git push --force` | Never. Use `git push` only |
| `prisma migrate reset` | Never on production or staging. Only on a local clean dev DB |
| Delete existing working frontend component | Create a new component; import alongside |

If something is wrong with existing code → **fix it in place, do not remove and recreate**.

---

### Rule 3 — SRP Code Is SRP Code

> **This system is SRP AI Growth. Not Tekgen. Not any other project.**

- Do not copy files, models, components, or logic from Tekgen or any other system
- SRP uses: NestJS + Prisma + Next.js 14 (App Router) + TanStack Query + Tailwind + Radix UI
- IDs: `SRP-CAN-XXXX`, `SRP-JD-XXXX`, `SRP-LD-XXXX` etc. — stored in `businessId` field
- Every record has `tenantId` — multi-tenant is not optional
- There is no leave, payroll, attendance in SRP — those belong to Tekgen

---

### Rule 4 — Phase Order Is the Build Order

> **Do not skip phases. Do not work on Phase 03 while Phase 01 is incomplete.**

Phases are sequential because each phase sets up what the next phase needs:
- Phase 01 establishes Lead → Client conversion (Phase 02 needs a Client to attach JDs to)
- Phase 02 establishes JD → Recruiter ownership (Phase 03 needs recruiter assignment to show correctly)
- Phase 03 enriches Candidate 360 (Phase 04 needs submission + interview tabs there)
- Phase 04 builds the submission detail + interview module (Phase 06 secures it at API level)

---

### Rule 5 — Every Migration Is Additive Only

When adding to `backend/prisma/schema.prisma`:
- Only `ADD COLUMN` or `CREATE TABLE` — never `DROP`, `RENAME`, `ALTER TYPE`  
- After editing schema: `npx prisma migrate dev --name descriptive_name`
- Naming convention: `add_field_to_entity` / `create_entity_table` — NOT `fix_stuff` or `update`
- After migrate: run seed only if explicitly needed — never seed on production

---

## Phase Build Order

```
Phase 01 → Phase 02 → Phase 03 → Phase 04 → Phase 06 → Phase 05 → Phase 07 → Phase 08 → Phase 09
```

---

## Phase 01 — SRP Sales Pipeline: CRM Completion

**Start here tomorrow.**

**Goal:** Complete the Sales CRM so the Sales team has a fully working tool before the Recruitment handoff is ever tightened.

**Branch:** `feature/phase-01-sales-crm-completion`

### Pre-Work Checklist (do before writing any code)
- [ ] `./scripts/backup-db.sh production` — backup confirmed ✅
- [ ] `git checkout main && git pull` — on latest code
- [ ] `git checkout -b feature/phase-01-sales-crm-completion`
- [ ] Confirm backend and frontend run locally: `docker compose up -d`
- [ ] Open `http://localhost:3001/api/docs` — Swagger loads ✅
- [ ] Open `http://localhost:3000/leads` — Leads page loads ✅

### Task Order (build in this exact order)

#### 1.1 — Lead → Client Conversion (Highest Priority)

**Why first:** Everything downstream (JDs, submissions, outreach) depends on Clients existing.

**Files to touch:**
- `backend/src/modules/leads/leads.service.ts` — add `convertToClient()` method
- `backend/src/modules/leads/leads.controller.ts` — add `POST /api/v1/leads/:id/convert`
- `backend/src/modules/clients/clients.service.ts` — add `createFromLead()` method
- `frontend/src/app/(dashboard)/leads/[id]/page.tsx` — add "Convert to Client" button
- `frontend/src/app/(dashboard)/clients/new/page.tsx` — pre-fill from Lead data

**What the service must do:**
1. Check `lead.convertedToClientId` is null (not already converted)
2. Create `Client` record from Lead + Company data
3. Set `lead.convertedToClientId = client.id`, `lead.convertedAt = now()`, `lead.stage = 'CONVERTED'`
4. Set `company.isClient = true`, `company.clientId = client.id` (if company linked)
5. Write to `audit_logs`: `LEAD_CONVERTED_TO_CLIENT`
6. Return new `client.id` → frontend redirects to `/clients/[id]`

**Do NOT:**
- Create a new leads module — it already exists: `backend/src/modules/leads/`
- Create a new clients module — it already exists: `backend/src/modules/clients/`
- Change any existing fields on the Lead model — only write to fields that already exist

---

#### 1.2 — Lead 360: ICP Score Explanation Panel

**Files to touch:**
- `frontend/src/app/(dashboard)/leads/[id]/page.tsx` — add score breakdown panel UI

**What to build:**
- Read `lead.scoreDetails` JSON (already stored)
- Render: Company Fit / Title Fit / Industry Fit / Country Fit / Engagement Fit — bar or score chip per dimension
- Recommended Action text based on score bucket (< 40 = Low, 40–70 = Medium, > 70 = High)
- No backend change needed — data is already there

---

#### 1.3 — Client 360: Contacts Tab

**Files to touch:**
- `frontend/src/app/(dashboard)/clients/[id]/page.tsx` — add Contacts tab alongside existing tabs

**What to build:**
- Query: `GET /api/v1/contacts?companyId={client.companyId}` (or clientId if linked)
- Render contacts table: Name, Title, Email, Phone, LinkedIn
- "Add Contact" button → opens contact form (contact module already exists)
- Do not create a new contacts API — check what `backend/src/modules/contacts/` already exposes first

---

#### 1.4 — Client 360: Commercials Tab (Sales + Finance + Admin only)

**Files to touch:**
- `frontend/src/app/(dashboard)/clients/[id]/page.tsx` — add Commercials tab
- Tab must only render for roles: `SUPER_ADMIN`, `TENANT_ADMIN`, `SALES_MANAGER`, `FINANCE`

**What to show:**
- Payment Terms, Submission Format (from `Client` model — already in schema)
- Billing Rate range from linked JDs (read-only aggregate)
- Source: which Lead it was converted from (link to Lead 360)

---

#### 1.5 — Client 360: Top KPI Cards

**Files to touch:**
- `frontend/src/app/(dashboard)/clients/[id]/page.tsx` — add stat cards at top of Overview tab
- `backend/src/modules/clients/clients.service.ts` — add `getClientStats(id)` method
- `backend/src/modules/clients/clients.controller.ts` — add `GET /api/v1/clients/:id/stats`

**Cards to show:** Total JDs · Open JDs · CVs Submitted · Interviews · Offers · Pending Feedback

---

#### 1.6 — Proposals Frontend

**Files to touch:**
- `frontend/src/app/(dashboard)/proposals/page.tsx` — CREATE (does not exist)
- `frontend/src/app/(dashboard)/proposals/new/page.tsx` — CREATE
- DO NOT create a backend proposals module — it already exists: `backend/src/modules/proposals/`
- Check what API endpoints exist first: read `backend/src/modules/proposals/proposals.controller.ts`

---

### Phase 01 — Merge Checklist
- [ ] Backup taken at start of session ✅
- [ ] All 6 sub-tasks complete
- [ ] No existing page broken (test Leads, Clients, Companies)
- [ ] Lead → Client conversion tested end-to-end
- [ ] Health check passes: `./scripts/verify-health.sh`
- [ ] `git push origin feature/phase-01-sales-crm-completion`
- [ ] PR to `main` — Reviewed before merge
- [ ] After merge: `./scripts/pre-deploy.sh production` on server

---

## Phase 02 — SRP JD Desk: Sales-to-Recruiter Handoff

**Do not start until Phase 01 is merged and deployed.**

**Branch:** `feature/phase-02-jd-desk`

### Task Order

#### 2.1 — JD Must Be Linked to a Client

**Files to touch:**
- `frontend/src/app/(dashboard)/jobs/new/page.tsx` — make Client field required
- `backend/src/modules/jobs/jobs.service.ts` — validate `clientId` on create
- ONLY if `Job.clientId` field is already in schema (it is — confirmed) — no migration needed

#### 2.2 — Multi-Recruiter Assignment on JD

**Schema check first:** `Job` model has `assignedRecruiterId` (single). Need to build a join table for multi-assign — OR use a `Json` array field. Decide and discuss before building. Lean toward a `JobRecruiterAssignment` table (proper relational approach).

**Migration (additive only):**
```prisma
model JobRecruiterAssignment {
  id          String   @id @default(uuid())
  jobId       String
  userId      String
  assignedAt  DateTime @default(now())
  assignedBy  String
  job         Job  @relation(fields: [jobId], references: [id], onDelete: Cascade)
  user        User @relation(fields: [userId], references: [id])
  @@unique([jobId, userId])
  @@map("job_recruiter_assignments")
}
```

#### 2.3 — JD 360: New Tabs

Add to `frontend/src/app/(dashboard)/jobs/[id]/page.tsx`:
- Submissions tab (read from `Submission` where `jobId = id`)
- Assigned Recruiters tab
- Boolean Search tab (modal with copy button)
- Commercials tab (Sales + Admin only)

#### 2.4 — Recruiter Sees Only Assigned JDs

`backend/src/modules/jobs/jobs.service.ts` — `findAll()` must filter by `assignedRecruiterId = req.user.id` when role is RECRUITER. No frontend change needed — the API sends the filtered list.

---

## Phase 03 — SRP Candidate 360: Full Profile

**Branch:** `feature/phase-03-candidate-360`

Add to `frontend/src/app/(dashboard)/candidates/[id]/page.tsx`:
- Submissions tab
- Interviews tab (placeholder until Phase 04)
- Emails tab (outreach messages sent to this candidate)
- Documents tab

Fix resume parsing display on Overview tab (parsedData field rendering).

---

## Phase 04 — SRP Placement Desk: Submission & Interview Flow

**Branch:** `feature/phase-04-placement-desk`

#### 4.1 — Submission Detail Page
Create: `frontend/src/app/(dashboard)/submissions/[id]/page.tsx`

#### 4.2 — Interview Model (New Schema Addition)

This is the ONE model missing from the schema. Add to `backend/prisma/schema.prisma`:
```prisma
model Interview {
  id              String   @id @default(uuid())
  businessId      String   @unique
  tenantId        String
  submissionId    String
  candidateId     String
  jobId           String
  clientId        String
  scheduledAt     DateTime
  interviewType   String   // Phone / Video / On-site / Panel
  status          InterviewStatus @default(SCHEDULED)
  notes           String?
  feedback        String?
  interviewerName String?
  meetingLink     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenant      Tenant      @relation(fields: [tenantId], references: [id])
  submission  Submission  @relation(fields: [submissionId], references: [id])
  candidate   Candidate   @relation(fields: [candidateId], references: [id])
  job         Job         @relation(fields: [jobId], references: [id])
  client      Client      @relation(fields: [clientId], references: [id])

  @@index([tenantId])
  @@index([submissionId])
  @@map("interviews")
}

enum InterviewStatus {
  SCHEDULED
  COMPLETED
  RESCHEDULED
  CANCELLED
  NO_SHOW
  SELECTED
  REJECTED
}
```

**Before adding this:** confirm no Interview model exists in schema. Then `npx prisma migrate dev --name create_interview_table --schema=backend/prisma/schema.prisma`

---

## Phase 05 — SRP Talent Search: Boolean & Talent Pool

**Branch:** `feature/phase-05-talent-search`

Boolean search generator (uses `job.booleanSearch` field — already in schema).  
Talent Pool — new model needed, additive migration.

---

## Phase 06 — SRP Commercial Firewall: API-Level RBAC

**Branch:** `feature/phase-06-commercial-firewall`

**Most critical security phase.** Apply role guards at the NestJS service level:
- Strip `billingRate`, `candidatePayRate`, `paymentTerms` from Recruiter API responses
- Guard job creation to Sales + Admin roles only
- Guard submission feedback update to Sales + Admin only
- Guard financial fields on Client to Finance + Admin only

---

## Phase 07 — SRP Cross-Team Alerts & QA

**Branch:** `feature/phase-07-alerts-qa`

In-app notifications + full QA test run: end-to-end from Lead → Placement.

---

## Phase 07 (renamed) — SRP My Hub: Team Productivity Layer

**Branch:** `feature/phase-07-my-hub`  
**Status:** ✅ DONE

Full spec: [docs/phases/PHASE-07-My-Hub.md](phases/PHASE-07-My-Hub.md)

---

## Phase 08 — SRP Connect: Global Outreach Channels

**Branch:** `feature/phase-08-srp-connect`  
**Status:** ✅ DONE

Full spec: [docs/phases/PHASE-08-Connect.md](phases/PHASE-08-Connect.md)

Gmail OAuth → Outlook OAuth → WhatsApp Business → Telegram → Microsoft Teams

---

## Phase 09 — SRP Reports & Analytics

**Branch:** `feature/phase-09-reports-analytics`  
**Status:** 🔶 NEXT

Full spec: [docs/phases/PHASE-09-Reports-Analytics.md](phases/PHASE-09-Reports-Analytics.md)

Advanced reporting → CSV/Excel exports → custom dashboards → scheduled email reports

---

## Daily Development Routine

Every working day, in this order:

```
1. BACKUP FIRST
   ./scripts/backup-db.sh production
   → Confirm file created
   → Copy to Google Drive / external storage

2. PULL LATEST
   git checkout main && git pull
   git checkout feature/phase-XX-name

3. START SERVICES
   docker compose up -d
   → Confirm frontend + backend + n8n running

4. BUILD THE TASK
   → Follow the task order in this doc
   → Test each sub-task before moving to next
   → No skipping ahead

5. COMMIT OFTEN (every sub-task)
   git add -A
   git commit -m "feat(phase-01): add lead to client conversion service"

6. END OF DAY
   git push origin feature/phase-XX-name
   → Do not leave unpushed code overnight

7. DEPLOY TO SERVER (only when phase is complete + PR merged)
   ./scripts/pre-deploy.sh production
   ./scripts/verify-health.sh
```

---

## Git Branch Naming

| Phase | Branch Name |
|-------|------------|
| Phase 01 | `feature/phase-01-sales-crm-completion` |
| Phase 02 | `feature/phase-02-jd-desk` |
| Phase 03 | `feature/phase-03-candidate-360` |
| Phase 04 | `feature/phase-04-placement-desk` |
| Phase 05 | `feature/phase-05-talent-search` |
| Phase 06 | `feature/phase-06-commercial-firewall` |
| Phase 07 | `feature/phase-07-alerts-qa` |
| Phase 07 | `feature/phase-07-my-hub` |
| Phase 08 | `feature/phase-08-srp-connect` |
| Phase 09 | `feature/phase-09-reports-analytics` |

**Hotfix branch (production emergency):** `hotfix/description-of-fix`

---

## Backup Storage Locations

| Copy | Where | Script |
|------|-------|--------|
| Local machine | `./backups/` folder in project | `./scripts/backup-db.sh` |
| Server | `/backups/postgres/` on server | `pre-deploy.sh` runs this automatically |
| Off-site | Google Drive / external USB | Manual copy after each backup |

**Minimum backup before any production deploy:** 2 copies must exist (local + server) before `pre-deploy.sh` is run.

**Backup filename format:** `srp_production_YYYYMMDD_HHMMSS.sql.gz`

---

## What Files Are Sacred — Do Not Break These

| File | Why Sacred |
|------|-----------|
| `backend/prisma/schema.prisma` | Full data model. Never delete fields. Only add. |
| `backend/src/main.ts` | App bootstrap. Only touch if explicitly needed. |
| `frontend/src/components/layout/sidebar.tsx` | Navigation. Add items only. Never remove existing. |
| `frontend/src/app/(dashboard)/candidates/page.tsx` | Full working table. Add columns only. |
| `frontend/src/app/(dashboard)/leads/page.tsx` | Full working table. Add columns only. |
| `frontend/src/store/auth.store.ts` | Auth state. Touch only if auth is broken. |
| `docker-compose.yml` | Dev environment. Only touch if adding new service. |
| `docker-compose.prod.yml` | Production environment. Never touch without backup. |
| `nginx/growth.srpailabs.com` | Reverse proxy. Touch only if routing changes. |
| `.env` files | Never commit to git. Never overwrite without backup. |

---

## Emergency Recovery — If Something Breaks

```
1. Don't panic. Don't make more changes.

2. Check what's broken:
   ./scripts/verify-health.sh

3. If DB is corrupted or data is wrong:
   ./scripts/rollback.sh backups/srp_production_LAST_GOOD_BACKUP.sql.gz

4. If code is broken but DB is fine:
   git revert HEAD        ← undo last commit
   OR
   git reset HEAD~1       ← ONLY on local, never on main

5. Never force-push to main. Never.

6. If in doubt: restore the backup and call for help before doing more.
```

---

## Phase Completion Criteria

A phase is only "complete" when ALL of the following are true:

- [ ] All sub-tasks in that phase are built and working
- [ ] No existing features were broken (manual smoke test)
- [ ] Health check passes: `./scripts/verify-health.sh`
- [ ] New backup taken after deployment
- [ ] PR merged to `main`
- [ ] Server deployed with `./scripts/pre-deploy.sh production`
- [ ] ROADMAP.md updated: phase status changed to ✅ DONE

---

## First Day Checklist (Tomorrow)

> Phase 01 starts here.

```
□ 1. Run backup: ./scripts/backup-db.sh production
□ 2. Confirm backup file in ./backups/ — size must be > 0
□ 3. Copy backup to external/Google Drive
□ 4. git checkout main && git pull
□ 5. git checkout -b feature/phase-01-sales-crm-completion
□ 6. docker compose up -d
□ 7. Open http://localhost:3000 — confirm system works
□ 8. Open http://localhost:3001/api/docs — confirm Swagger loads
□ 9. Read: backend/src/modules/leads/leads.service.ts  (understand existing code)
□ 10. Read: backend/src/modules/clients/clients.service.ts (understand existing code)
□ 11. START: Phase 01 Task 1.1 — Lead → Client Conversion Service
```

**Do not skip step 1, 2, and 3.**
