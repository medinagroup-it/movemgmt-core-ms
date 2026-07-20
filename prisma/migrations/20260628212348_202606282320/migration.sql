-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('AUTO', 'FURGONE');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('DISPONIBILE', 'NOLEGGIATO', 'MANUTENZIONE', 'NON_DISPONIBILE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('BOZZA', 'CONFERMATA', 'ANNULLATA', 'IN_CORSO', 'CONCLUSA');

-- CreateEnum
CREATE TYPE "DamageStatus" AS ENUM ('APERTO', 'RIPARATO');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cognome" TEXT NOT NULL,
    "dataNascita" TIMESTAMP(3) NOT NULL,
    "luogoNascita" TEXT NOT NULL,
    "codiceFiscale" TEXT NOT NULL,
    "indirizzoResidenza" TEXT NOT NULL,
    "luogoRilascioCartaIdentita" TEXT NOT NULL,
    "numeroCartaIdentita" TEXT NOT NULL,
    "dataRilascioCartaIdentita" TIMESTAMP(3),
    "dataScadenzaCartaIdentita" TIMESTAMP(3),
    "luogoRilascioPatente" TEXT NOT NULL,
    "numeroPatente" TEXT NOT NULL,
    "dataRilascioPatente" TIMESTAMP(3),
    "dataScadenzaPatente" TIMESTAMP(3),
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "tipo" "VehicleType" NOT NULL,
    "marca" TEXT NOT NULL,
    "modello" TEXT NOT NULL,
    "targa" TEXT NOT NULL,
    "dataImmatricolazione" TIMESTAMP(3) NOT NULL,
    "alimentazione" TEXT NOT NULL,
    "lunghezza" DECIMAL(10,2),
    "larghezza" DECIMAL(10,2),
    "altezza" DECIMAL(10,2),
    "stato" "VehicleStatus" NOT NULL DEFAULT 'DISPONIBILE',
    "kmAttuali" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "veicoloId" TEXT NOT NULL,
    "dataPrenotazione" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataInizioContratto" TIMESTAMP(3) NOT NULL,
    "dataFineContratto" TIMESTAMP(3) NOT NULL,
    "prezzo" DECIMAL(10,2) NOT NULL,
    "chilometraggioGiornaliero" INTEGER,
    "nomeOperatore" TEXT NOT NULL,
    "coperturaAssicurativa" TEXT,
    "stato" "BookingStatus" NOT NULL DEFAULT 'BOZZA',
    "kmInizio" INTEGER,
    "kmFine" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDamage" (
    "id" TEXT NOT NULL,
    "veicoloId" TEXT NOT NULL,
    "stato" "DamageStatus" NOT NULL DEFAULT 'APERTO',
    "note" TEXT,
    "lat" DECIMAL(8,6) NOT NULL,
    "long" DECIMAL(8,6) NOT NULL,
    "dataAggiunta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataRiparazione" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "VehicleDamage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_codiceFiscale_key" ON "Client"("codiceFiscale");

-- CreateIndex
CREATE UNIQUE INDEX "Client_numeroCartaIdentita_key" ON "Client"("numeroCartaIdentita");

-- CreateIndex
CREATE UNIQUE INDEX "Client_numeroPatente_key" ON "Client"("numeroPatente");

-- CreateIndex
CREATE INDEX "Client_cognome_nome_idx" ON "Client"("cognome", "nome");

-- CreateIndex
CREATE INDEX "Client_telefono_idx" ON "Client"("telefono");

-- CreateIndex
CREATE INDEX "Client_deletedAt_idx" ON "Client"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_targa_key" ON "Vehicle"("targa");

-- CreateIndex
CREATE INDEX "Vehicle_targa_idx" ON "Vehicle"("targa");

-- CreateIndex
CREATE INDEX "Vehicle_marca_modello_idx" ON "Vehicle"("marca", "modello");

-- CreateIndex
CREATE INDEX "Vehicle_stato_idx" ON "Vehicle"("stato");

-- CreateIndex
CREATE INDEX "Vehicle_deletedAt_idx" ON "Vehicle"("deletedAt");

-- CreateIndex
CREATE INDEX "Booking_clienteId_idx" ON "Booking"("clienteId");

-- CreateIndex
CREATE INDEX "Booking_veicoloId_idx" ON "Booking"("veicoloId");

-- CreateIndex
CREATE INDEX "Booking_dataInizioContratto_dataFineContratto_idx" ON "Booking"("dataInizioContratto", "dataFineContratto");

-- CreateIndex
CREATE INDEX "Booking_stato_idx" ON "Booking"("stato");

-- CreateIndex
CREATE INDEX "Booking_deletedAt_idx" ON "Booking"("deletedAt");

-- CreateIndex
CREATE INDEX "VehicleDamage_veicoloId_idx" ON "VehicleDamage"("veicoloId");

-- CreateIndex
CREATE INDEX "VehicleDamage_stato_idx" ON "VehicleDamage"("stato");

-- CreateIndex
CREATE INDEX "VehicleDamage_deletedAt_idx" ON "VehicleDamage"("deletedAt");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_veicoloId_fkey" FOREIGN KEY ("veicoloId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDamage" ADD CONSTRAINT "VehicleDamage_veicoloId_fkey" FOREIGN KEY ("veicoloId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
