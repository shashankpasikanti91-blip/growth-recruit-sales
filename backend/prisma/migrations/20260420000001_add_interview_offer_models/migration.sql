-- CreateTable: Interview
CREATE TABLE "interviews" (
    "id"           TEXT NOT NULL,
    "businessId"   TEXT NOT NULL,
    "tenantId"     TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "candidateId"  TEXT NOT NULL,
    "jobId"        TEXT NOT NULL,
    "clientId"     TEXT,
    "round"        INTEGER NOT NULL DEFAULT 1,
    "mode"         TEXT NOT NULL DEFAULT 'VIDEO',
    "scheduledAt"  TIMESTAMP(3),
    "completedAt"  TIMESTAMP(3),
    "meetingLink"  TEXT,
    "status"       TEXT NOT NULL DEFAULT 'SCHEDULED',
    "feedback"     TEXT,
    "rating"       INTEGER,
    "result"       TEXT,
    "notes"        TEXT,
    "createdById"  TEXT,
    "deletedAt"    TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Offer
CREATE TABLE "offers" (
    "id"             TEXT NOT NULL,
    "businessId"     TEXT NOT NULL,
    "tenantId"       TEXT NOT NULL,
    "submissionId"   TEXT NOT NULL,
    "candidateId"    TEXT NOT NULL,
    "jobId"          TEXT NOT NULL,
    "clientId"       TEXT,
    "offeredSalary"  DOUBLE PRECISION,
    "currency"       TEXT DEFAULT 'USD',
    "joiningDate"    TIMESTAMP(3),
    "offerLetterUrl" TEXT,
    "status"         TEXT NOT NULL DEFAULT 'PENDING',
    "expiryDate"     TIMESTAMP(3),
    "declineReason"  TEXT,
    "notes"          TEXT,
    "createdById"    TEXT,
    "deletedAt"      TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interviews_businessId_key" ON "interviews"("businessId");
CREATE INDEX "interviews_tenantId_idx"     ON "interviews"("tenantId");
CREATE INDEX "interviews_submissionId_idx" ON "interviews"("submissionId");

CREATE UNIQUE INDEX "offers_businessId_key" ON "offers"("businessId");
CREATE INDEX "offers_tenantId_idx"     ON "offers"("tenantId");
CREATE INDEX "offers_submissionId_idx" ON "offers"("submissionId");

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interviews" ADD CONSTRAINT "interviews_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "offers" ADD CONSTRAINT "offers_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "offers" ADD CONSTRAINT "offers_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
