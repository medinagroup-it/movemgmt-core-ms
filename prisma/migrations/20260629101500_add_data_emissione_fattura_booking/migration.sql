-- Add optional invoice issue date to bookings
ALTER TABLE "Booking" ADD COLUMN "dataEmissioneFattura" TIMESTAMP(3);
