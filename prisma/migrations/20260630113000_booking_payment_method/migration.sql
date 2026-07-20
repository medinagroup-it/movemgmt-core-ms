-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CONTANTI', 'CARTA_CREDITO', 'CARTA_DEBITO', 'BONIFICO', 'ASSEGNO', 'ALTRO');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "metodoPagamento" "PaymentMethod";

-- CreateIndex
CREATE INDEX "Booking_metodoPagamento_idx" ON "Booking"("metodoPagamento");
