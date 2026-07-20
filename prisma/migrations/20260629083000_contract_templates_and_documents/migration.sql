-- CreateTable
CREATE TABLE "ContractTemplate" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractTemplate_companyId_code_key" ON "ContractTemplate"("companyId", "code");

-- CreateIndex
CREATE INDEX "ContractTemplate_companyId_idx" ON "ContractTemplate"("companyId");

-- CreateIndex
CREATE INDEX "ContractTemplate_isDefault_idx" ON "ContractTemplate"("isDefault");

-- CreateIndex
CREATE INDEX "ContractTemplate_deletedAt_idx" ON "ContractTemplate"("deletedAt");

-- AddForeignKey
ALTER TABLE "ContractTemplate" ADD CONSTRAINT "ContractTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
