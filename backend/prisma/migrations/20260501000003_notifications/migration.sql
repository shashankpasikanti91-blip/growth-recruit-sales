-- CreateTable: notifications
CREATE TABLE "notifications" (
    "id"         TEXT NOT NULL,
    "tenantId"   TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "type"       TEXT NOT NULL,
    "title"      TEXT NOT NULL,
    "body"       TEXT NOT NULL,
    "entityType" TEXT,
    "entityId"   TEXT,
    "isRead"     BOOLEAN NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "notifications_tenantId_userId_idx" ON "notifications"("tenantId", "userId");
CREATE INDEX "notifications_userId_isRead_idx"   ON "notifications"("userId", "isRead");
