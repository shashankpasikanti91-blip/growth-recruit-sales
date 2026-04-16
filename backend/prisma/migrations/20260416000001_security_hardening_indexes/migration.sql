-- Security Hardening: Prevent accidental audit log deletion
-- AuditLog must use RESTRICT to preserve compliance records when tenant is deleted
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_tenantId_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add missing foreign key indexes for query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS "outreach_messages_sequenceId_idx" ON "outreach_messages" ("sequenceId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "outreach_messages_candidateId_idx" ON "outreach_messages" ("candidateId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "outreach_messages_leadId_idx" ON "outreach_messages" ("leadId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "invoices_subscriptionId_idx" ON "invoices" ("subscriptionId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "usage_records_subscriptionId_idx" ON "usage_records" ("subscriptionId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ai_analysis_results_candidateId_idx" ON "ai_analysis_results" ("candidateId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ai_analysis_results_leadId_idx" ON "ai_analysis_results" ("leadId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ai_analysis_results_serviceType_idx" ON "ai_analysis_results" ("serviceType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs" ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs" ("createdAt");
