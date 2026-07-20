-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CIE_FRONT', 'CIE_BACK', 'DRIVING_LICENSE_FRONT', 'DRIVING_LICENSE_BACK', 'SIGNED_CONTRACT', 'CONTRACT_PDF', 'OTHER');

-- AlterTable
ALTER TABLE "ContractDocument" ADD COLUMN "documentAssetId" TEXT;

-- CreateTable
CREATE TABLE "DocumentAsset" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "originalName" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL_FILESYSTEM',
    "storagePath" TEXT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "bookingId" TEXT,
    "clientId" TEXT,
    "contractDocumentId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "DocumentAsset_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DocumentAsset" ADD CONSTRAINT "DocumentAsset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "ContractDocument_documentAssetId_idx" ON "ContractDocument"("documentAssetId");
CREATE INDEX "DocumentAsset_companyId_idx" ON "DocumentAsset"("companyId");
CREATE INDEX "DocumentAsset_type_idx" ON "DocumentAsset"("type");
CREATE INDEX "DocumentAsset_bookingId_idx" ON "DocumentAsset"("bookingId");
CREATE INDEX "DocumentAsset_clientId_idx" ON "DocumentAsset"("clientId");
CREATE INDEX "DocumentAsset_contractDocumentId_idx" ON "DocumentAsset"("contractDocumentId");
CREATE INDEX "DocumentAsset_checksumSha256_idx" ON "DocumentAsset"("checksumSha256");
CREATE INDEX "DocumentAsset_createdAt_idx" ON "DocumentAsset"("createdAt");
CREATE INDEX "DocumentAsset_deletedAt_idx" ON "DocumentAsset"("deletedAt");
