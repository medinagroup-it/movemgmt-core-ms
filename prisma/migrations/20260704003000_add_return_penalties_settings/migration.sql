ALTER TABLE "RentalSettings"
  ADD COLUMN IF NOT EXISTS "costoKmEccedenza" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "penaleCarburante" DECIMAL(10,2);

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "kmEccedenza" INTEGER,
  ADD COLUMN IF NOT EXISTS "importoPenaleKm" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "importoPenaleCarburante" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "importoPenali" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "metodoPagamentoPenali" "PaymentMethod";
