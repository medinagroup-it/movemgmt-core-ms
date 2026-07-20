-- CreateTable
CREATE TABLE "CargosPortalConfig" (
    "companyId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordEncrypted" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "CargosPortalConfig_pkey" PRIMARY KEY ("companyId")
);

-- CreateIndex
CREATE INDEX "CargosPortalConfig_deletedAt_idx" ON "CargosPortalConfig"("deletedAt");

-- AddForeignKey
ALTER TABLE "CargosPortalConfig" ADD CONSTRAINT "CargosPortalConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
