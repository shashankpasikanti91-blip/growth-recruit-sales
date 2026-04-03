-- ============================================================================
-- SRP AI Labs — SaaS Upgrade Migration
-- Adds business IDs, usage tracking, auth provider, plan enhancements
-- ============================================================================

-- 1. Add AuthProvider enum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE');

-- 2. Add FREE tier to PlanTier
ALTER TYPE "PlanTier" ADD VALUE IF NOT EXISTS 'FREE' BEFORE 'STARTER';

-- ============================================================================
-- TENANT: Add new fields
-- ============================================================================
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "maxCandidatesPerMonth" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "maxLeadsPerMonth" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "maxAiUsagePerMonth" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "currentCandidateUsage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "currentLeadUsage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "currentAiUsage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "billingStatus" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "usageResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Set maxUsers default to 1 for free tier (existing tenants keep their value)
ALTER TABLE "tenants" ALTER COLUMN "maxUsers" SET DEFAULT 1;

-- Backfill businessId for existing tenants
UPDATE "tenants" t SET "businessId" = sub.bid FROM (
  SELECT id, 'TEN-' || EXTRACT(YEAR FROM "createdAt")::TEXT || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 4, '0') AS bid
  FROM "tenants" WHERE "businessId" IS NULL
) sub WHERE t.id = sub.id;
ALTER TABLE "tenants" ALTER COLUMN "businessId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_businessId_key" ON "tenants"("businessId");

-- ============================================================================
-- USER: Add new fields
-- ============================================================================
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fullName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "authProvider" "AuthProvider" NOT NULL DEFAULT 'EMAIL';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleId" TEXT;

-- Make passwordHash nullable (for future Google auth)
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Backfill fullName
UPDATE "users" SET "fullName" = "firstName" || ' ' || "lastName" WHERE "fullName" = '' OR "fullName" IS NULL;

-- Backfill businessId for existing users
UPDATE "users" u SET "businessId" = sub.bid FROM (
  SELECT id, 'USR-' || EXTRACT(YEAR FROM "createdAt")::TEXT || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 4, '0') AS bid
  FROM "users" WHERE "businessId" IS NULL
) sub WHERE u.id = sub.id;
ALTER TABLE "users" ALTER COLUMN "businessId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_businessId_key" ON "users"("businessId");
CREATE INDEX IF NOT EXISTS "users_businessId_idx" ON "users"("businessId");

-- ============================================================================
-- CANDIDATE: Add businessId
-- ============================================================================
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
UPDATE "candidates" c SET "businessId" = sub.bid FROM (
  SELECT id, 'CAN-' || TO_CHAR("createdAt", 'YYYYMM') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 6, '0') AS bid
  FROM "candidates" WHERE "businessId" IS NULL
) sub WHERE c.id = sub.id;
ALTER TABLE "candidates" ALTER COLUMN "businessId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "candidates_businessId_key" ON "candidates"("businessId");
CREATE INDEX IF NOT EXISTS "candidates_businessId_idx" ON "candidates"("businessId");

-- ============================================================================
-- RESUME: Add businessId
-- ============================================================================
ALTER TABLE "resumes" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
UPDATE "resumes" r SET "businessId" = sub.bid FROM (
  SELECT id, 'RES-' || TO_CHAR("createdAt", 'YYYYMM') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 6, '0') AS bid
  FROM "resumes" WHERE "businessId" IS NULL
) sub WHERE r.id = sub.id;
ALTER TABLE "resumes" ALTER COLUMN "businessId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "resumes_businessId_key" ON "resumes"("businessId");
CREATE INDEX IF NOT EXISTS "resumes_businessId_idx" ON "resumes"("businessId");

-- ============================================================================
-- JOB: Add businessId
-- ============================================================================
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
UPDATE "jobs" j SET "businessId" = sub.bid FROM (
  SELECT id, 'JOB-' || TO_CHAR("createdAt", 'YYYYMM') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 6, '0') AS bid
  FROM "jobs" WHERE "businessId" IS NULL
) sub WHERE j.id = sub.id;
ALTER TABLE "jobs" ALTER COLUMN "businessId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_businessId_key" ON "jobs"("businessId");
CREATE INDEX IF NOT EXISTS "jobs_businessId_idx" ON "jobs"("businessId");

-- ============================================================================
-- APPLICATION: Add businessId
-- ============================================================================
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
UPDATE "applications" a SET "businessId" = sub.bid FROM (
  SELECT id, 'APP-' || TO_CHAR("appliedAt", 'YYYYMM') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY "appliedAt")::TEXT, 6, '0') AS bid
  FROM "applications" WHERE "businessId" IS NULL
) sub WHERE a.id = sub.id;
ALTER TABLE "applications" ALTER COLUMN "businessId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "applications_businessId_key" ON "applications"("businessId");
CREATE INDEX IF NOT EXISTS "applications_businessId_idx" ON "applications"("businessId");

-- ============================================================================
-- LEAD: Add businessId
-- ============================================================================
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
UPDATE "leads" l SET "businessId" = sub.bid FROM (
  SELECT id, 'LED-' || TO_CHAR("createdAt", 'YYYYMM') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 6, '0') AS bid
  FROM "leads" WHERE "businessId" IS NULL
) sub WHERE l.id = sub.id;
ALTER TABLE "leads" ALTER COLUMN "businessId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "leads_businessId_key" ON "leads"("businessId");
CREATE INDEX IF NOT EXISTS "leads_businessId_idx" ON "leads"("businessId");

-- ============================================================================
-- COMPANY: Add businessId + new fields
-- ============================================================================
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "domain" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "registrationNumber" TEXT;
UPDATE "companies" co SET "businessId" = sub.bid FROM (
  SELECT id, 'COM-' || TO_CHAR("createdAt", 'YYYYMM') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 6, '0') AS bid
  FROM "companies" WHERE "businessId" IS NULL
) sub WHERE co.id = sub.id;
ALTER TABLE "companies" ALTER COLUMN "businessId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "companies_businessId_key" ON "companies"("businessId");
CREATE INDEX IF NOT EXISTS "companies_businessId_idx" ON "companies"("businessId");

-- ============================================================================
-- CONTACT: Add businessId
-- ============================================================================
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
UPDATE "contacts" ct SET "businessId" = sub.bid FROM (
  SELECT id, 'CNT-' || TO_CHAR("createdAt", 'YYYYMM') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 6, '0') AS bid
  FROM "contacts" WHERE "businessId" IS NULL
) sub WHERE ct.id = sub.id;
ALTER TABLE "contacts" ALTER COLUMN "businessId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "contacts_businessId_key" ON "contacts"("businessId");
CREATE INDEX IF NOT EXISTS "contacts_businessId_idx" ON "contacts"("businessId");

-- ============================================================================
-- ACTIVITY: Add businessId
-- ============================================================================
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
UPDATE "activities" ac SET "businessId" = sub.bid FROM (
  SELECT id, 'ACT-' || TO_CHAR("createdAt", 'YYYYMM') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 6, '0') AS bid
  FROM "activities" WHERE "businessId" IS NULL
) sub WHERE ac.id = sub.id;
ALTER TABLE "activities" ALTER COLUMN "businessId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "activities_businessId_key" ON "activities"("businessId");
CREATE INDEX IF NOT EXISTS "activities_businessId_idx" ON "activities"("businessId");

-- ============================================================================
-- OUTREACH MESSAGE: Add businessId
-- ============================================================================
ALTER TABLE "outreach_messages" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
UPDATE "outreach_messages" om SET "businessId" = sub.bid FROM (
  SELECT id, 'OUT-' || TO_CHAR("createdAt", 'YYYYMM') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 6, '0') AS bid
  FROM "outreach_messages" WHERE "businessId" IS NULL
) sub WHERE om.id = sub.id;
ALTER TABLE "outreach_messages" ALTER COLUMN "businessId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "outreach_messages_businessId_key" ON "outreach_messages"("businessId");
CREATE INDEX IF NOT EXISTS "outreach_messages_businessId_idx" ON "outreach_messages"("businessId");

-- ============================================================================
-- WORKFLOW RUN: Add businessId
-- ============================================================================
ALTER TABLE "workflow_runs" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
UPDATE "workflow_runs" wr SET "businessId" = sub.bid FROM (
  SELECT id, 'WFR-' || TO_CHAR("createdAt", 'YYYYMM') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 6, '0') AS bid
  FROM "workflow_runs" WHERE "businessId" IS NULL
) sub WHERE wr.id = sub.id;
ALTER TABLE "workflow_runs" ALTER COLUMN "businessId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "workflow_runs_businessId_key" ON "workflow_runs"("businessId");
CREATE INDEX IF NOT EXISTS "workflow_runs_businessId_idx" ON "workflow_runs"("businessId");

-- ============================================================================
-- Full-text search indexes for global search
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "candidates_search_idx" ON "candidates" USING gin (
  (COALESCE("firstName", '') || ' ' || COALESCE("lastName", '') || ' ' || COALESCE("email", '') || ' ' || COALESCE("currentTitle", '') || ' ' || COALESCE("currentCompany", '')) gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS "leads_search_idx" ON "leads" USING gin (
  (COALESCE("firstName", '') || ' ' || COALESCE("lastName", '') || ' ' || COALESCE("email", '') || ' ' || COALESCE("title", '')) gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS "companies_search_idx" ON "companies" USING gin (
  (COALESCE("name", '') || ' ' || COALESCE("website", '') || ' ' || COALESCE("industry", '')) gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS "contacts_search_idx" ON "contacts" USING gin (
  (COALESCE("firstName", '') || ' ' || COALESCE("lastName", '') || ' ' || COALESCE("email", '') || ' ' || COALESCE("title", '')) gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS "jobs_search_idx" ON "jobs" USING gin (
  (COALESCE("title", '') || ' ' || COALESCE("department", '') || ' ' || COALESCE("location", '')) gin_trgm_ops
);
