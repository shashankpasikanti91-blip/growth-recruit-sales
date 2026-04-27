-- ─────────────────────────────────────────────────────────────────────────────
-- Sales CRM Upgrade Migration
-- Adds Client Master, Opportunities, Follow Ups, Proposals, Submissions
-- Plus JD–Client relationship and Company isClient flag
-- SRP AI Labs — SRP AI Growth v3.0
-- ─────────────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. New Enums
-- ──────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROSPECT', 'ON_HOLD', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "OpportunityStage" AS ENUM ('DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'VERBAL_COMMIT', 'CLOSED_WON', 'CLOSED_LOST', 'ON_HOLD');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "FollowUpType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'LINKEDIN', 'WHATSAPP', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'DONE', 'CANCELLED', 'RESCHEDULED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'REVISED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "SubmissionStage" AS ENUM ('DRAFT', 'INTERNAL_REVIEW', 'SUBMITTED_TO_SALES', 'SUBMITTED_TO_CLIENT', 'CLIENT_REVIEW', 'INTERVIEW', 'OFFER', 'JOINED', 'REJECTED', 'WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Clients Table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "clients" (
  "id"                    TEXT          NOT NULL,
  "businessId"            TEXT          NOT NULL,
  "tenantId"              TEXT          NOT NULL,
  "name"                  TEXT          NOT NULL,
  "industry"              TEXT,
  "website"               TEXT,
  "countryCode"           TEXT,
  "state"                 TEXT,
  "city"                  TEXT,
  "address"               TEXT,
  "primaryContactId"      TEXT,
  "billingContactName"    TEXT,
  "billingContactEmail"   TEXT,
  "status"                "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
  "salesOwnerId"          TEXT,
  "recruitmentManagerId"  TEXT,
  "paymentTerms"          TEXT,
  "submissionFormat"      TEXT,
  "requiredDocuments"     TEXT[]        NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes"                 TEXT,
  "sourceLeadId"          TEXT,
  "sourceCompanyId"       TEXT,
  "deletedAt"             TIMESTAMP(3),
  "createdAt"             TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "clients_businessId_key"    ON "clients" ("businessId");
CREATE       INDEX IF NOT EXISTS "clients_tenantId_idx"       ON "clients" ("tenantId");
CREATE       INDEX IF NOT EXISTS "clients_status_idx"         ON "clients" ("status");

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Opportunities Table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "opportunities" (
  "id"                  TEXT             NOT NULL,
  "businessId"          TEXT             NOT NULL,
  "tenantId"            TEXT             NOT NULL,
  "clientId"            TEXT,
  "leadId"              TEXT,
  "title"               TEXT             NOT NULL,
  "value"               DOUBLE PRECISION,
  "currency"            TEXT             NOT NULL DEFAULT 'USD',
  "stage"               "OpportunityStage" NOT NULL DEFAULT 'DISCOVERY',
  "probability"         INTEGER          NOT NULL DEFAULT 0,
  "expectedCloseDate"   TIMESTAMP(3),
  "ownerId"             TEXT,
  "notes"               TEXT,
  "lostReason"          TEXT,
  "closedAt"            TIMESTAMP(3),
  "deletedAt"           TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "opportunities_businessId_key" ON "opportunities" ("businessId");
CREATE       INDEX IF NOT EXISTS "opportunities_tenantId_idx"    ON "opportunities" ("tenantId");
CREATE       INDEX IF NOT EXISTS "opportunities_clientId_idx"    ON "opportunities" ("clientId");

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Follow Ups Table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "follow_ups" (
  "id"            TEXT             NOT NULL,
  "businessId"    TEXT             NOT NULL,
  "tenantId"      TEXT             NOT NULL,
  "clientId"      TEXT,
  "leadId"        TEXT,
  "contactId"     TEXT,
  "type"          "FollowUpType"   NOT NULL DEFAULT 'CALL',
  "status"        "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
  "subject"       TEXT,
  "notes"         TEXT,
  "scheduledAt"   TIMESTAMP(3)     NOT NULL,
  "completedAt"   TIMESTAMP(3),
  "ownerId"       TEXT,
  "reminderAt"    TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "follow_ups_businessId_key"  ON "follow_ups" ("businessId");
CREATE       INDEX IF NOT EXISTS "follow_ups_tenantId_idx"     ON "follow_ups" ("tenantId");
CREATE       INDEX IF NOT EXISTS "follow_ups_clientId_idx"     ON "follow_ups" ("clientId");
CREATE       INDEX IF NOT EXISTS "follow_ups_scheduledAt_idx"  ON "follow_ups" ("scheduledAt");

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Proposals Table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "proposals" (
  "id"          TEXT             NOT NULL,
  "businessId"  TEXT             NOT NULL,
  "tenantId"    TEXT             NOT NULL,
  "clientId"    TEXT,
  "leadId"      TEXT,
  "title"       TEXT             NOT NULL,
  "status"      "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
  "value"       DOUBLE PRECISION,
  "currency"    TEXT             NOT NULL DEFAULT 'USD',
  "validUntil"  TIMESTAMP(3),
  "sentAt"      TIMESTAMP(3),
  "acceptedAt"  TIMESTAMP(3),
  "rejectedAt"  TIMESTAMP(3),
  "notes"       TEXT,
  "fileUrl"     TEXT,
  "ownerId"     TEXT,
  "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "proposals_businessId_key" ON "proposals" ("businessId");
CREATE       INDEX IF NOT EXISTS "proposals_tenantId_idx"    ON "proposals" ("tenantId");
CREATE       INDEX IF NOT EXISTS "proposals_clientId_idx"    ON "proposals" ("clientId");

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Submissions Table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "submissions" (
  "id"              TEXT              NOT NULL,
  "businessId"      TEXT              NOT NULL,
  "tenantId"        TEXT              NOT NULL,
  "clientId"        TEXT              NOT NULL,
  "jobId"           TEXT              NOT NULL,
  "candidateId"     TEXT              NOT NULL,
  "recruiterId"     TEXT,
  "salesOwnerId"    TEXT,
  "stage"           "SubmissionStage" NOT NULL DEFAULT 'DRAFT',
  "aiScore"         DOUBLE PRECISION,
  "aiScoreDetails"  JSONB,
  "recruiterNotes"  TEXT,
  "clientFeedback"  TEXT,
  "interviewDate"   TIMESTAMP(3),
  "offerStatus"     TEXT,
  "submittedAt"     TIMESTAMP(3),
  "lastActivityAt"  TIMESTAMP(3),
  "deletedAt"       TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "submissions_pkey"                       PRIMARY KEY ("id"),
  CONSTRAINT "submissions_clientId_jobId_candidateId_key" UNIQUE ("clientId", "jobId", "candidateId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "submissions_businessId_key"  ON "submissions" ("businessId");
CREATE       INDEX IF NOT EXISTS "submissions_tenantId_idx"     ON "submissions" ("tenantId");
CREATE       INDEX IF NOT EXISTS "submissions_clientId_idx"     ON "submissions" ("clientId");
CREATE       INDEX IF NOT EXISTS "submissions_jobId_idx"        ON "submissions" ("jobId");
CREATE       INDEX IF NOT EXISTS "submissions_candidateId_idx"  ON "submissions" ("candidateId");

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. Extend existing tables
-- ──────────────────────────────────────────────────────────────────────────────

-- Companies: isClient flag + clientId link
ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "isClient"  BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "clientId"  TEXT;

-- Leads: client conversion fields
ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "convertedToClientId"  TEXT,
  ADD COLUMN IF NOT EXISTS "convertedAt"          TIMESTAMP(3);

-- Jobs: JD–Client relationship + billing + recruitment assignment
ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "clientId"               TEXT,
  ADD COLUMN IF NOT EXISTS "billingRate"             DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "candidatePayRate"        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "targetSubmissionDate"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "jobReceivedDate"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "visaRequirement"         TEXT,
  ADD COLUMN IF NOT EXISTS "booleanSearch"           TEXT,
  ADD COLUMN IF NOT EXISTS "secondarySkills"         TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "recruitmentManagerId"    TEXT,
  ADD COLUMN IF NOT EXISTS "assignedRecruiterId"     TEXT;

-- Activities: new entity references
ALTER TABLE "activities"
  ADD COLUMN IF NOT EXISTS "clientId"       TEXT,
  ADD COLUMN IF NOT EXISTS "submissionId"   TEXT,
  ADD COLUMN IF NOT EXISTS "opportunityId"  TEXT;

-- Documents: client link
ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "clientId"  TEXT;

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. New Indexes on extended columns
-- ──────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "jobs_clientId_idx"              ON "jobs" ("clientId");
CREATE INDEX IF NOT EXISTS "activities_clientId_idx"        ON "activities" ("clientId");
CREATE INDEX IF NOT EXISTS "activities_submissionId_idx"    ON "activities" ("submissionId");
CREATE INDEX IF NOT EXISTS "documents_clientId_idx"         ON "documents" ("clientId");
CREATE INDEX IF NOT EXISTS "leads_convertedToClientId_idx"  ON "leads" ("convertedToClientId");
