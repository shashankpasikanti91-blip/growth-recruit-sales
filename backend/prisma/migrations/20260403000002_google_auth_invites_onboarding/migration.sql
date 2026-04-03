-- CreateEnum: InviteStatus
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- AlterTable: Add invite tracking fields to users
ALTER TABLE "users" ADD COLUMN "invitedByUserId" TEXT;
ALTER TABLE "users" ADD COLUMN "invitedAt" TIMESTAMP(3);

-- AddForeignKey: users.invitedByUserId -> users.id
ALTER TABLE "users" ADD CONSTRAINT "users_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: tenant_invites
CREATE TABLE "tenant_invites" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "acceptedByUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tenant_onboardings
CREATE TABLE "tenant_onboardings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "currentStep" TEXT NOT NULL DEFAULT 'company_details',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_onboardings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: tenant_invites
CREATE UNIQUE INDEX "tenant_invites_token_key" ON "tenant_invites"("token");
CREATE UNIQUE INDEX "tenant_invites_tenantId_email_status_key" ON "tenant_invites"("tenantId", "email", "status");
CREATE INDEX "tenant_invites_tenantId_idx" ON "tenant_invites"("tenantId");
CREATE INDEX "tenant_invites_token_idx" ON "tenant_invites"("token");

-- CreateIndex: tenant_onboardings
CREATE UNIQUE INDEX "tenant_onboardings_tenantId_key" ON "tenant_onboardings"("tenantId");
CREATE INDEX "tenant_onboardings_tenantId_idx" ON "tenant_onboardings"("tenantId");

-- AddForeignKey: tenant_invites
ALTER TABLE "tenant_invites" ADD CONSTRAINT "tenant_invites_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_invites" ADD CONSTRAINT "tenant_invites_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_invites" ADD CONSTRAINT "tenant_invites_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: tenant_onboardings
ALTER TABLE "tenant_onboardings" ADD CONSTRAINT "tenant_onboardings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
