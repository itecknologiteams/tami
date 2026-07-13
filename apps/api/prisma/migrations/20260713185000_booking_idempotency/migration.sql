ALTER TABLE "Ride" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "Ride_riderId_idempotencyKey_key"
ON "Ride"("riderId", "idempotencyKey");
