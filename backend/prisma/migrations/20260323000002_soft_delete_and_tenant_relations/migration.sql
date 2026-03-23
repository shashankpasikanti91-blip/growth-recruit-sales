-- Phase 3: Add soft-delete columns, Tenant FK relations for Contact/Scorecard/Activity/IcpProfile
-- and LINKEDIN_CONTENT enum value to AiServiceType

-- Add LINKEDIN_CONTENT to AiServiceType enum
ALTER TYPE "AiServiceType" ADD VALUE IF NOT EXISTS 'LINKEDIN_CONTENT';

-- Add soft-delete to Job
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add soft-delete to Company
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add soft-delete to Contact
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add soft-delete to IcpProfile
ALTER TABLE "icp_profiles" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Partial indexes for active records (filter out soft-deleted rows from common queries)
CREATE INDEX IF NOT EXISTS "jobs_tenantId_active_idx" ON "jobs" ("tenantId") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "companies_tenantId_active_idx" ON "companies" ("tenantId") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "contacts_tenantId_active_idx" ON "contacts" ("tenantId") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "icp_profiles_tenantId_active_idx" ON "icp_profiles" ("tenantId") WHERE "deletedAt" IS NULL;
