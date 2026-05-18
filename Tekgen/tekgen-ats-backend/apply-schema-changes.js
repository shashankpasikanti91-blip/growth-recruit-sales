/**
 * Safe schema migration script — only adds new columns/tables.
 * Does NOT drop or reset anything.
 * Run: node apply-schema-changes.js
 */
require('dotenv').config();
const prisma = require('./src/config/database');

const migrations = [
  // ─── Phase 2: Client table ────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayId" TEXT UNIQUE,
    "clientName" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "country" TEXT,
    "primaryContact" TEXT,
    "clientOwner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "ownerId" TEXT`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='clients_ownerId_fkey') THEN ALTER TABLE "clients" ADD CONSTRAINT "clients_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,

  // ─── Phase 4: Screening Sessions table ────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "screening_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "screeningType" TEXT NOT NULL DEFAULT 'single',
    "jobId" TEXT,
    "clientId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "totalCandidates" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "tokenUsageTotal" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='screening_sessions_createdById_fkey') THEN ALTER TABLE "screening_sessions" ADD CONSTRAINT "screening_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
  `CREATE INDEX IF NOT EXISTS "screening_sessions_createdById_idx" ON "screening_sessions"("createdById")`,
  `CREATE INDEX IF NOT EXISTS "screening_sessions_createdAt_idx" ON "screening_sessions"("createdAt")`,

  // ─── Phase 1: Job new columns ─────────────────────────────────────────────
  `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "preferredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[]`,
  `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "mandatorySkills" TEXT[] DEFAULT ARRAY[]::TEXT[]`,
  `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "country" TEXT`,
  `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "salaryCurrency" TEXT DEFAULT 'MYR'`,
  `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "salaryFrequency" TEXT DEFAULT 'monthly'`,
  `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "workAuthorization" TEXT`,
  `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "parsedJobDescription" TEXT`,
  `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "booleanSearchString" TEXT`,
  `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "jobDescriptionRaw" TEXT`,
  `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "contractDuration" TEXT`,
  `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "clientId" TEXT`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='jobs_clientId_fkey') THEN ALTER TABLE "jobs" ADD CONSTRAINT "jobs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,

  // ─── Phase 3: Candidate new columns ───────────────────────────────────────
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "country" TEXT`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "currentCompany" TEXT`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "resumeHash" TEXT`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "parserConfidence" DOUBLE PRECISION`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "parsingStatus" TEXT DEFAULT 'COMPLETE'`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "manuallyOverridden" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "parsedAt" TIMESTAMP(3)`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "latestScreenedJobId" TEXT`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "latestScreenedJobTitle" TEXT`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "latestAiScore" INTEGER`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "latestClientId" TEXT`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "latestClientName" TEXT`,

  // ─── Phase 4: Screening new columns ───────────────────────────────────────
  `ALTER TABLE "screenings" ADD COLUMN IF NOT EXISTS "missingSkills" TEXT[] DEFAULT ARRAY[]::TEXT[]`,
  `ALTER TABLE "screenings" ADD COLUMN IF NOT EXISTS "aiSummary" TEXT`,
  `ALTER TABLE "screenings" ADD COLUMN IF NOT EXISTS "redFlags" TEXT[] DEFAULT ARRAY[]::TEXT[]`,
  `ALTER TABLE "screenings" ADD COLUMN IF NOT EXISTS "skillMatchPct" INTEGER`,
  `ALTER TABLE "screenings" ADD COLUMN IF NOT EXISTS "expMatchPct" INTEGER`,
  `ALTER TABLE "screenings" ADD COLUMN IF NOT EXISTS "salaryFit" TEXT`,
  `ALTER TABLE "screenings" ADD COLUMN IF NOT EXISTS "locationFit" TEXT`,
  `ALTER TABLE "screenings" ADD COLUMN IF NOT EXISTS "modelUsed" TEXT`,
  `ALTER TABLE "screenings" ADD COLUMN IF NOT EXISTS "tokenUsage" INTEGER`,
  `ALTER TABLE "screenings" ADD COLUMN IF NOT EXISTS "clientId" TEXT`,
  `ALTER TABLE "screenings" ADD COLUMN IF NOT EXISTS "sessionId" TEXT`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='screenings_clientId_fkey') THEN ALTER TABLE "screenings" ADD CONSTRAINT "screenings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='screenings_sessionId_fkey') THEN ALTER TABLE "screenings" ADD CONSTRAINT "screenings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "screening_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,

  // ─── Phase 5: Application new columns ─────────────────────────────────────
  `ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "aiMatchScore" INTEGER`,
  `ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "screeningId" TEXT`,
  `ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "clientId" TEXT`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='applications_clientId_fkey') THEN ALTER TABLE "applications" ADD CONSTRAINT "applications_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,

  // ─── Phase 6: IntegrationSetting OAuth columns ────────────────────────────
  `ALTER TABLE "integration_settings" ADD COLUMN IF NOT EXISTS "oauthAccessToken" TEXT`,
  `ALTER TABLE "integration_settings" ADD COLUMN IF NOT EXISTS "oauthRefreshToken" TEXT`,
  `ALTER TABLE "integration_settings" ADD COLUMN IF NOT EXISTS "oauthTokenExpiry" TIMESTAMP(3)`,
  `ALTER TABLE "integration_settings" ADD COLUMN IF NOT EXISTS "oauthScope" TEXT`,
  `ALTER TABLE "integration_settings" ADD COLUMN IF NOT EXISTS "oauthAccountEmail" TEXT`,
  `ALTER TABLE "integration_settings" ADD COLUMN IF NOT EXISTS "oauthStatus" TEXT DEFAULT 'DISCONNECTED'`,
  `ALTER TABLE "integration_settings" ADD COLUMN IF NOT EXISTS "approvedByAdmin" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "integration_settings" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3)`,
  `ALTER TABLE "integration_settings" ADD COLUMN IF NOT EXISTS "requestedAt" TIMESTAMP(3)`,
];

async function run() {
  console.log('Connected to database via Prisma.');
  let ok = 0, skip = 0, fail = 0;
  for (const sql of migrations) {
    try {
      await prisma.$executeRawUnsafe(sql);
      ok++;
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
        skip++;
      } else {
        console.error('FAIL:', err.message.substring(0, 200));
        console.error('SQL:', sql.substring(0, 100));
        fail++;
      }
    }
  }
  console.log(`\nDone. Applied: ${ok}, Skipped (already exists): ${skip}, Failed: ${fail}`);
  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
