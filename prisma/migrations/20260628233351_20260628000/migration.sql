/*
  Warnings:

  - You are about to drop the column `kmFine` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `lat` on the `VehicleDamage` table. All the data in the column will be lost.
  - You are about to drop the column `long` on the `VehicleDamage` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[companyId,codiceFiscale]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,numeroCartaIdentita]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,numeroPatente]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,targa]` on the table `Vehicle` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `companyId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Client` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sesso` to the `Client` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `costoGiornaliero` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `alimentazione` on the `Vehicle` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `companyId` to the `VehicleDamage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `x` to the `VehicleDamage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `y` to the `VehicleDamage` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('BENZINA', 'DIESEL', 'GPL', 'METANO', 'IBRIDA', 'ELETTRICA');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ATTIVO', 'DISATTIVO', 'SCADUTO');

-- DropIndex
DROP INDEX "Client_codiceFiscale_key";

-- DropIndex
DROP INDEX "Client_numeroCartaIdentita_key";

-- DropIndex
DROP INDEX "Client_numeroPatente_key";

-- DropIndex
DROP INDEX "Vehicle_targa_key";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "kmFine",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "coperturaAssicurativaId" TEXT,
ADD COLUMN     "operatorId" TEXT,
ALTER COLUMN "stato" SET DEFAULT 'CONFERMATA';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "sesso" "Gender" NOT NULL;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "costoGiornaliero" DECIMAL(10,2) NOT NULL,
DROP COLUMN "alimentazione",
ADD COLUMN     "alimentazione" "FuelType" NOT NULL;

-- AlterTable
ALTER TABLE "VehicleDamage" DROP COLUMN "lat",
DROP COLUMN "long",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "x" INTEGER NOT NULL,
ADD COLUMN     "y" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "nomeSocieta" TEXT NOT NULL,
    "ragioneSociale" TEXT NOT NULL,
    "partitaIva" TEXT NOT NULL,
    "codiceFiscale" TEXT NOT NULL,
    "indirizzoSedeLegale" TEXT NOT NULL,
    "codiceUnivoco" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "stato" "AccountStatus" NOT NULL DEFAULT 'ATTIVO',
    "dataScadenza" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceCoverage" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "costo" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "InsuranceCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operator" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cognome" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_partitaIva_key" ON "Company"("partitaIva");

-- CreateIndex
CREATE UNIQUE INDEX "Company_codiceFiscale_key" ON "Company"("codiceFiscale");

-- CreateIndex
CREATE UNIQUE INDEX "Company_email_key" ON "Company"("email");

-- CreateIndex
CREATE INDEX "Company_partitaIva_idx" ON "Company"("partitaIva");

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE INDEX "Account_companyId_idx" ON "Account"("companyId");

-- CreateIndex
CREATE INDEX "Account_email_idx" ON "Account"("email");

-- CreateIndex
CREATE INDEX "Account_stato_idx" ON "Account"("stato");

-- CreateIndex
CREATE INDEX "InsuranceCoverage_companyId_idx" ON "InsuranceCoverage"("companyId");

-- CreateIndex
CREATE INDEX "InsuranceCoverage_deletedAt_idx" ON "InsuranceCoverage"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceCoverage_companyId_nome_key" ON "InsuranceCoverage"("companyId", "nome");

-- CreateIndex
CREATE INDEX "Operator_companyId_idx" ON "Operator"("companyId");

-- CreateIndex
CREATE INDEX "Operator_nome_cognome_idx" ON "Operator"("nome", "cognome");

-- CreateIndex
CREATE INDEX "Operator_deletedAt_idx" ON "Operator"("deletedAt");

-- CreateIndex
CREATE INDEX "Booking_companyId_idx" ON "Booking"("companyId");

-- CreateIndex
CREATE INDEX "Client_companyId_idx" ON "Client"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_companyId_codiceFiscale_key" ON "Client"("companyId", "codiceFiscale");

-- CreateIndex
CREATE UNIQUE INDEX "Client_companyId_numeroCartaIdentita_key" ON "Client"("companyId", "numeroCartaIdentita");

-- CreateIndex
CREATE UNIQUE INDEX "Client_companyId_numeroPatente_key" ON "Client"("companyId", "numeroPatente");

-- CreateIndex
CREATE INDEX "Vehicle_companyId_idx" ON "Vehicle"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_companyId_targa_key" ON "Vehicle"("companyId", "targa");

-- CreateIndex
CREATE INDEX "VehicleDamage_companyId_idx" ON "VehicleDamage"("companyId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceCoverage" ADD CONSTRAINT "InsuranceCoverage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operator" ADD CONSTRAINT "Operator_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_coperturaAssicurativaId_fkey" FOREIGN KEY ("coperturaAssicurativaId") REFERENCES "InsuranceCoverage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDamage" ADD CONSTRAINT "VehicleDamage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
