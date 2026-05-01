-- CreateTable
CREATE TABLE "talent_pools" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talent_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talent_pool_members" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "poolId"      TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "addedById"   TEXT,
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "talent_pool_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "queryJson"   JSONB NOT NULL,
    "entityType"  TEXT NOT NULL DEFAULT 'candidate',
    "createdById" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "talent_pools_tenantId_idx" ON "talent_pools"("tenantId");

-- CreateIndex
CREATE INDEX "talent_pool_members_tenantId_idx" ON "talent_pool_members"("tenantId");

-- CreateIndex
CREATE INDEX "talent_pool_members_candidateId_idx" ON "talent_pool_members"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "talent_pool_members_poolId_candidateId_key" ON "talent_pool_members"("poolId", "candidateId");

-- CreateIndex
CREATE INDEX "saved_searches_tenantId_idx" ON "saved_searches"("tenantId");

-- AddForeignKey
ALTER TABLE "talent_pools" ADD CONSTRAINT "talent_pools_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_pool_members" ADD CONSTRAINT "talent_pool_members_poolId_fkey"
    FOREIGN KEY ("poolId") REFERENCES "talent_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_pool_members" ADD CONSTRAINT "talent_pool_members_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
