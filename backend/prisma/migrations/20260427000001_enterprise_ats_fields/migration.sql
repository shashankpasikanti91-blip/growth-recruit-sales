-- ─────────────────────────────────────────────────────────────────────────────
-- Enterprise ATS Fields Migration
-- Adds missing fields required for enterprise Workday/Ceipal-grade ATS
-- SRP AI Labs — Growth OS v2.0
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Candidate model: stage, overallScore, expectedSalary, noticePeriodDays,
--    lastActivityAt, assignedToId, starRating
ALTER TABLE "candidates"
  ADD COLUMN IF NOT EXISTS "stage"              TEXT          NOT NULL DEFAULT 'SOURCED',
  ADD COLUMN IF NOT EXISTS "overallScore"       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "expectedSalary"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "currentSalary"      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "salaryCurrency"     TEXT          DEFAULT 'MYR',
  ADD COLUMN IF NOT EXISTS "noticePeriodDays"   INTEGER,
  ADD COLUMN IF NOT EXISTS "lastActivityAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "assignedToId"       TEXT,
  ADD COLUMN IF NOT EXISTS "starRating"         INTEGER       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "source"             TEXT,
  ADD COLUMN IF NOT EXISTS "recruiterNotes"     TEXT;

-- 2. Jobs model: hiringManagerId, priority, openings, postedByUserId, deletedAt (already exists per schema check)
ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "hiringManagerId"    TEXT,
  ADD COLUMN IF NOT EXISTS "priority"           TEXT          DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "openings"           INTEGER       DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "postedByUserId"     TEXT,
  ADD COLUMN IF NOT EXISTS "lastActivityAt"     TIMESTAMP(3);

-- 3. Applications model: interviewDate, offerStatus, rejectionReason, recruiterNotes (already has some)
ALTER TABLE "applications"
  ADD COLUMN IF NOT EXISTS "interviewDate"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "offerStatus"        TEXT,
  ADD COLUMN IF NOT EXISTS "rejectionReason"    TEXT,
  ADD COLUMN IF NOT EXISTS "lastActivityAt"     TIMESTAMP(3);

-- 4. Leads model: priority, lastContactedAt, nextFollowUpAt, assignedToId, ownerId
ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "priority"           TEXT          DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "lastContactedAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "nextFollowUpAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "assignedToId"       TEXT,
  ADD COLUMN IF NOT EXISTS "companyName"        TEXT,
  ADD COLUMN IF NOT EXISTS "industry"           TEXT,
  ADD COLUMN IF NOT EXISTS "countryCode"        TEXT,
  ADD COLUMN IF NOT EXISTS "lastActivityAt"     TIMESTAMP(3);

-- 5. Index new FK-like columns for performance
CREATE INDEX IF NOT EXISTS "candidates_stage_idx" ON "candidates" ("stage");
CREATE INDEX IF NOT EXISTS "candidates_assignedToId_idx" ON "candidates" ("assignedToId");
CREATE INDEX IF NOT EXISTS "candidates_lastActivityAt_idx" ON "candidates" ("lastActivityAt");
CREATE INDEX IF NOT EXISTS "jobs_priority_idx" ON "jobs" ("priority");
CREATE INDEX IF NOT EXISTS "leads_priority_idx" ON "leads" ("priority");
CREATE INDEX IF NOT EXISTS "leads_assignedToId_idx" ON "leads" ("assignedToId");
CREATE INDEX IF NOT EXISTS "leads_lastActivityAt_idx" ON "leads" ("lastActivityAt");
