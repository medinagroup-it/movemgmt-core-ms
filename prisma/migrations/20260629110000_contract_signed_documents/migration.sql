-- CreateTable
CREATE TABLE "ContractDocument" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "templateCode" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "bookingId" TEXT,
    "clientId" TEXT,
    "html" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractDocument_companyId_idx" ON "ContractDocument"("companyId");

-- CreateIndex
CREATE INDEX "ContractDocument_templateCode_idx" ON "ContractDocument"("templateCode");

-- CreateIndex
CREATE INDEX "ContractDocument_bookingId_idx" ON "ContractDocument"("bookingId");

-- CreateIndex
CREATE INDEX "ContractDocument_clientId_idx" ON "ContractDocument"("clientId");

-- CreateIndex
CREATE INDEX "ContractDocument_createdAt_idx" ON "ContractDocument"("createdAt");

-- CreateIndex
CREATE INDEX "ContractDocument_deletedAt_idx" ON "ContractDocument"("deletedAt");

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContractTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
