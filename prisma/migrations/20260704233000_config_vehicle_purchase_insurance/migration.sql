DO $$ BEGIN
  CREATE TYPE "CostMode" AS ENUM ('IMPORTO_FISSO', 'PERCENTUALE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PurchaseMethod" AS ENUM ('LEASING', 'NOLEGGIO', 'ACQUISTO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "InsuranceCoverage"
  ADD COLUMN IF NOT EXISTS "costo" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "costoTipo" "CostMode" DEFAULT 'IMPORTO_FISSO',
  ADD COLUMN IF NOT EXISTS "franchigiaRcaTipo" "CostMode" DEFAULT 'IMPORTO_FISSO',
  ADD COLUMN IF NOT EXISTS "franchigiaKaskoTipo" "CostMode" DEFAULT 'IMPORTO_FISSO',
  ADD COLUMN IF NOT EXISTS "scopertoFurtoIncendio" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "scopertoFurtoIncendioTipo" "CostMode" DEFAULT 'IMPORTO_FISSO';

UPDATE "InsuranceCoverage"
SET "costo" = COALESCE("costo", "costoImportoFisso", "costoPercentuale"),
    "costoTipo" = CASE WHEN "costoPercentuale" IS NOT NULL AND COALESCE("costoPercentuale", 0) > 0 THEN 'PERCENTUALE'::"CostMode" ELSE COALESCE("costoTipo", 'IMPORTO_FISSO'::"CostMode") END,
    "scopertoFurtoIncendio" = COALESCE("scopertoFurtoIncendio", "franchigiaFurtoIncendio")
WHERE "costo" IS NULL OR "scopertoFurtoIncendio" IS NULL;

ALTER TABLE "MileagePackage"
  ADD COLUMN IF NOT EXISTS "chilometraggio" INTEGER,
  ADD COLUMN IF NOT EXISTS "costo" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "costoTipo" "CostMode" DEFAULT 'IMPORTO_FISSO';

UPDATE "MileagePackage"
SET "costo" = COALESCE("costo", "costoImportoFisso", "costoPercentuale"),
    "costoTipo" = CASE WHEN "costoPercentuale" IS NOT NULL AND COALESCE("costoPercentuale", 0) > 0 THEN 'PERCENTUALE'::"CostMode" ELSE COALESCE("costoTipo", 'IMPORTO_FISSO'::"CostMode") END
WHERE "costo" IS NULL;

ALTER TABLE "AdditionalService"
  ADD COLUMN IF NOT EXISTS "costo" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "costoTipo" "CostMode" DEFAULT 'IMPORTO_FISSO';

UPDATE "AdditionalService"
SET "costo" = COALESCE("costo", "costoImportoFisso", "costoPercentuale"),
    "costoTipo" = CASE WHEN "costoPercentuale" IS NOT NULL AND COALESCE("costoPercentuale", 0) > 0 THEN 'PERCENTUALE'::"CostMode" ELSE COALESCE("costoTipo", 'IMPORTO_FISSO'::"CostMode") END
WHERE "costo" IS NULL;

ALTER TABLE "RentalSettings"
  ADD COLUMN IF NOT EXISTS "costoConducenteAggiuntivo" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "costoConducenteAggiuntivoTipo" "CostMode" DEFAULT 'IMPORTO_FISSO';

UPDATE "RentalSettings"
SET "costoConducenteAggiuntivo" = COALESCE("costoConducenteAggiuntivo", "costoConducenteAggiuntivoImportoFisso", "costoConducenteAggiuntivoPercentuale"),
    "costoConducenteAggiuntivoTipo" = CASE WHEN "costoConducenteAggiuntivoPercentuale" IS NOT NULL AND COALESCE("costoConducenteAggiuntivoPercentuale", 0) > 0 THEN 'PERCENTUALE'::"CostMode" ELSE COALESCE("costoConducenteAggiuntivoTipo", 'IMPORTO_FISSO'::"CostMode") END
WHERE "costoConducenteAggiuntivo" IS NULL;

ALTER TABLE "Operator"
  ADD COLUMN IF NOT EXISTS "accountId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Operator_accountId_key" ON "Operator"("accountId");
CREATE INDEX IF NOT EXISTS "Operator_email_idx" ON "Operator"("email");

ALTER TABLE "Vehicle"
  ADD COLUMN IF NOT EXISTS "lunghezzaInterna" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "larghezzaInterna" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "altezzaInterna" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "postiAuto" INTEGER,
  ADD COLUMN IF NOT EXISTS "metodoAcquisto" "PurchaseMethod",
  ADD COLUMN IF NOT EXISTS "canoneMensile" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "importoVeicolo" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "franchigiaRca" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "franchigiaRcaTipo" "CostMode" DEFAULT 'IMPORTO_FISSO',
  ADD COLUMN IF NOT EXISTS "franchigiaKasko" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "franchigiaKaskoTipo" "CostMode" DEFAULT 'IMPORTO_FISSO',
  ADD COLUMN IF NOT EXISTS "scopertoFurtoIncendio" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "scopertoFurtoIncendioTipo" "CostMode" DEFAULT 'IMPORTO_FISSO',
  ADD COLUMN IF NOT EXISTS "compagniaAssicurativa" TEXT,
  ADD COLUMN IF NOT EXISTS "dataScadenzaAssicurazione" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "importoAssicurazione" DECIMAL(10,2);
