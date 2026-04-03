-- CreateEnum: DocumentType
CREATE TYPE "DocumentType" AS ENUM ('RESUME', 'LEAD_DOC', 'PROPOSAL', 'CONTRACT', 'COMPANY_DOC', 'OTHER');

-- CreateEnum: UploadStatus
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'UPLOADING', 'COMPLETED', 'FAILED', 'VIRUS_DETECTED');

-- CreateTable: documents
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageBucket" TEXT NOT NULL DEFAULT 'documents',
    "checksum" TEXT NOT NULL,
    "rawText" TEXT,
    "parsedData" JSONB,
    "aiSummary" TEXT,
    "candidateId" TEXT,
    "leadId" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "jobId" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_businessId_key" ON "documents"("businessId");
CREATE INDEX "documents_tenantId_idx" ON "documents"("tenantId");
CREATE INDEX "documents_businessId_idx" ON "documents"("businessId");
CREATE INDEX "documents_tenantId_type_idx" ON "documents"("tenantId", "type");
CREATE INDEX "documents_checksum_idx" ON "documents"("checksum");
CREATE INDEX "documents_candidateId_idx" ON "documents"("candidateId");
CREATE INDEX "documents_leadId_idx" ON "documents"("leadId");
CREATE INDEX "documents_companyId_idx" ON "documents"("companyId");
CREATE INDEX "documents_contactId_idx" ON "documents"("contactId");
CREATE INDEX "documents_jobId_idx" ON "documents"("jobId");

-- AddForeignKeys
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
