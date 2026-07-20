-- Booking delivery / return flow
CREATE TYPE "DepositPaymentMethod" AS ENUM ('CONTANTI', 'CARTA', 'BONIFICO');

ALTER TABLE "Booking"
  ADD COLUMN "consegnaEffettuataAt" TIMESTAMP(3),
  ADD COLUMN "importoCauzione" DECIMAL(10,2),
  ADD COLUMN "metodoPagamentoCauzione" "DepositPaymentMethod",
  ADD COLUMN "codicePreautorizzazioneCauzione" TEXT,
  ADD COLUMN "livelloCarburanteConsegna" INTEGER,
  ADD COLUMN "kmConsegna" INTEGER,
  ADD COLUMN "riconsegnaEffettuataAt" TIMESTAMP(3),
  ADD COLUMN "livelloCarburanteRiconsegna" INTEGER,
  ADD COLUMN "kmRiconsegna" INTEGER,
  ADD COLUMN "cauzioneRestituita" BOOLEAN,
  ADD COLUMN "cauzioneTrattenuta" BOOLEAN,
  ADD COLUMN "noteRiconsegna" TEXT;
