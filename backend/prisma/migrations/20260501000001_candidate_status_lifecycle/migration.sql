-- Phase 04: Candidate 19-Status Lifecycle Engine + Onboarding Checklist
-- Creates: candidate_status_history, candidate_onboarding

-- ─── Candidate Status History ─────────────────────────────────────────────────

CREATE TABLE "candidate_status_history" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "fromStatus"  TEXT,
    "toStatus"    TEXT NOT NULL,
    "changedById" TEXT,
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_status_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "candidate_status_history"
    ADD CONSTRAINT "candidate_status_history_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "candidate_status_history"
    ADD CONSTRAINT "candidate_status_history_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "candidate_status_history_candidateId_idx" ON "candidate_status_history" ("candidateId");
CREATE INDEX "candidate_status_history_tenantId_idx"    ON "candidate_status_history" ("tenantId");

-- ─── Candidate Onboarding Checklist ──────────────────────────────────────────

CREATE TABLE "candidate_onboarding" (
    "id"                  TEXT NOT NULL,
    "tenantId"            TEXT NOT NULL,
    "candidateId"         TEXT NOT NULL,
    "expectedJoiningDate" TIMESTAMP(3),
    "actualJoiningDate"   TIMESTAMP(3),
    "passportStatus"      TEXT NOT NULL DEFAULT 'MISSING',
    "visaDocStatus"       TEXT NOT NULL DEFAULT 'MISSING',
    "offerLetterStatus"   TEXT NOT NULL DEFAULT 'MISSING',
    "contractStatus"      TEXT NOT NULL DEFAULT 'MISSING',
    "bankDetailsStatus"   TEXT NOT NULL DEFAULT 'MISSING',
    "completionPct"       INTEGER NOT NULL DEFAULT 0,
    "notes"               TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_onboarding_pkey"         PRIMARY KEY ("id"),
    CONSTRAINT "candidate_onboarding_candidateId_key" UNIQUE ("candidateId")
);

ALTER TABLE "candidate_onboarding"
    ADD CONSTRAINT "candidate_onboarding_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "candidate_onboarding"
    ADD CONSTRAINT "candidate_onboarding_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "candidate_onboarding_tenantId_idx" ON "candidate_onboarding" ("tenantId");
