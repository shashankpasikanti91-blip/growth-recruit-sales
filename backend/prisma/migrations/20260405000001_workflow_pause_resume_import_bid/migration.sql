-- ─── Migration: Workflow Pause/Resume Controls + Import Business IDs ───────────
-- Adds PAUSED status to workflow runs, pause/override tracking fields,
-- and business ID support for source imports.

-- 1. Add PAUSED to WorkflowRunStatus enum
ALTER TYPE "WorkflowRunStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

-- 2. Add pause / override fields to workflow_runs
ALTER TABLE "workflow_runs"
  ADD COLUMN IF NOT EXISTS "isPaused"     BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "pausedAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resumedAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pauseReason"  TEXT,
  ADD COLUMN IF NOT EXISTS "overrideNote" TEXT,
  ADD COLUMN IF NOT EXISTS "overriddenBy" TEXT,
  ADD COLUMN IF NOT EXISTS "overriddenAt" TIMESTAMP(3);

-- 3. Add status index to workflow_runs (missing from previous migrations)
CREATE INDEX IF NOT EXISTS "workflow_runs_status_idx" ON "workflow_runs"("status");

-- 4. Add businessId column to source_imports
ALTER TABLE "source_imports"
  ADD COLUMN IF NOT EXISTS "businessId" TEXT;

-- 5. Back-fill businessId for any existing source_imports rows (IMP-YYYYMM-NNNNNN)
DO $$
DECLARE
  rec RECORD;
  counter INT := 1;
  date_part TEXT;
BEGIN
  FOR rec IN SELECT id, "createdAt" FROM source_imports WHERE "businessId" IS NULL ORDER BY "createdAt" LOOP
    date_part := TO_CHAR(rec."createdAt", 'YYYYMM');
    UPDATE source_imports
       SET "businessId" = 'IMP-' || date_part || '-' || LPAD(counter::TEXT, 6, '0')
     WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- 6. Add unique constraint on source_imports.businessId
CREATE UNIQUE INDEX IF NOT EXISTS "source_imports_business_id_key" ON "source_imports"("businessId");
