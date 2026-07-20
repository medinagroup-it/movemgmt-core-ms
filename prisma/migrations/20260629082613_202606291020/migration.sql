/*
  Warnings:

  - You are about to drop the column `costo` on the `InsuranceCoverage` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ExtraCostType" AS ENUM ('IMPORTO_FISSO', 'PERCENTUALE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "billingDataId" TEXT,
ADD COLUMN     "conducenteAggiuntivoId" TEXT,
ADD COLUMN     "mileagePackageId" TEXT;

-- AlterTable
ALTER TABLE "InsuranceCoverage" DROP COLUMN "costo",
ADD COLUMN     "costoImportoFisso" DECIMAL(10,2),
ADD COLUMN     "costoPercentuale" DECIMAL(5,2),
ADD COLUMN     "franchigiaFurtoIncendio" DECIMAL(10,2),
ADD COLUMN     "franchigiaKasko" DECIMAL(10,2),
ADD COLUMN     "franchigiaRca" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "BillingData" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "partitaIva" TEXT,
    "codiceFiscale" TEXT NOT NULL,
    "ragioneSociale" TEXT NOT NULL,
    "indirizzoSedeLegale" TEXT NOT NULL,
    "codiceUnivoco" TEXT,
    "pec" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "BillingData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MileagePackage" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "costoImportoFisso" DECIMAL(10,2),
    "costoPercentuale" DECIMAL(5,2),
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "MileagePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalService" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,
    "costoImportoFisso" DECIMAL(10,2),
    "costoPercentuale" DECIMAL(5,2),
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "AdditionalService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalSettings" (
    "companyId" TEXT NOT NULL,
    "costoConducenteAggiuntivoImportoFisso" DECIMAL(10,2),
    "costoConducenteAggiuntivoPercentuale" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "RentalSettings_pkey" PRIMARY KEY ("companyId")
);

-- CreateTable
CREATE TABLE "BookingAdditionalService" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "additionalServiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "BookingAdditionalService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fine" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "veicoloId" TEXT NOT NULL,
    "bookingId" TEXT,
    "targa" TEXT NOT NULL,
    "dataMulta" TIMESTAMP(3) NOT NULL,
    "importo" DECIMAL(10,2) NOT NULL,
    "dataNotifica" TIMESTAMP(3) NOT NULL,
    "luogoInfrazione" TEXT NOT NULL,
    "dataRinotifica" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "Fine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingData_companyId_idx" ON "BillingData"("companyId");

-- CreateIndex
CREATE INDEX "BillingData_clienteId_idx" ON "BillingData"("clienteId");

-- CreateIndex
CREATE INDEX "BillingData_ragioneSociale_idx" ON "BillingData"("ragioneSociale");

-- CreateIndex
CREATE INDEX "BillingData_deletedAt_idx" ON "BillingData"("deletedAt");

-- CreateIndex
CREATE INDEX "MileagePackage_companyId_idx" ON "MileagePackage"("companyId");

-- CreateIndex
CREATE INDEX "MileagePackage_deletedAt_idx" ON "MileagePackage"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MileagePackage_companyId_nome_key" ON "MileagePackage"("companyId", "nome");

-- CreateIndex
CREATE INDEX "AdditionalService_companyId_idx" ON "AdditionalService"("companyId");

-- CreateIndex
CREATE INDEX "AdditionalService_deletedAt_idx" ON "AdditionalService"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdditionalService_companyId_nome_key" ON "AdditionalService"("companyId", "nome");

-- CreateIndex
CREATE INDEX "BookingAdditionalService_companyId_idx" ON "BookingAdditionalService"("companyId");

-- CreateIndex
CREATE INDEX "BookingAdditionalService_bookingId_idx" ON "BookingAdditionalService"("bookingId");

-- CreateIndex
CREATE INDEX "BookingAdditionalService_additionalServiceId_idx" ON "BookingAdditionalService"("additionalServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingAdditionalService_bookingId_additionalServiceId_key" ON "BookingAdditionalService"("bookingId", "additionalServiceId");

-- CreateIndex
CREATE INDEX "Fine_companyId_idx" ON "Fine"("companyId");

-- CreateIndex
CREATE INDEX "Fine_veicoloId_idx" ON "Fine"("veicoloId");

-- CreateIndex
CREATE INDEX "Fine_bookingId_idx" ON "Fine"("bookingId");

-- CreateIndex
CREATE INDEX "Fine_dataMulta_idx" ON "Fine"("dataMulta");

-- CreateIndex
CREATE INDEX "Fine_deletedAt_idx" ON "Fine"("deletedAt");

-- CreateIndex
CREATE INDEX "Booking_conducenteAggiuntivoId_idx" ON "Booking"("conducenteAggiuntivoId");

-- CreateIndex
CREATE INDEX "Booking_billingDataId_idx" ON "Booking"("billingDataId");

-- AddForeignKey
ALTER TABLE "BillingData" ADD CONSTRAINT "BillingData_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingData" ADD CONSTRAINT "BillingData_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MileagePackage" ADD CONSTRAINT "MileagePackage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalService" ADD CONSTRAINT "AdditionalService_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalSettings" ADD CONSTRAINT "RentalSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_conducenteAggiuntivoId_fkey" FOREIGN KEY ("conducenteAggiuntivoId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_billingDataId_fkey" FOREIGN KEY ("billingDataId") REFERENCES "BillingData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_mileagePackageId_fkey" FOREIGN KEY ("mileagePackageId") REFERENCES "MileagePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAdditionalService" ADD CONSTRAINT "BookingAdditionalService_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAdditionalService" ADD CONSTRAINT "BookingAdditionalService_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAdditionalService" ADD CONSTRAINT "BookingAdditionalService_additionalServiceId_fkey" FOREIGN KEY ("additionalServiceId") REFERENCES "AdditionalService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fine" ADD CONSTRAINT "Fine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fine" ADD CONSTRAINT "Fine_veicoloId_fkey" FOREIGN KEY ("veicoloId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fine" ADD CONSTRAINT "Fine_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
