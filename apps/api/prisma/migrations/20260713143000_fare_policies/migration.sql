-- CreateTable
CREATE TABLE "FarePolicy" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "baseFareMinor" INTEGER NOT NULL,
    "perKilometerMinor" INTEGER NOT NULL,
    "perMinuteMinor" INTEGER NOT NULL,
    "bookingFeeMinor" INTEGER NOT NULL,
    "minimumFareMinor" INTEGER NOT NULL,
    "demandMultiplier" DECIMAL(5,2) NOT NULL,
    "maximumMultiplier" DECIMAL(5,2) NOT NULL,
    "maximumFareMinor" INTEGER,
    "roadFactor" DECIMAL(5,2) NOT NULL,
    "averageSpeedKph" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarePolicyCategoryRate" (
    "farePolicyId" TEXT NOT NULL,
    "categoryCode" "RideCategoryCode" NOT NULL,
    "multiplier" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "FarePolicyCategoryRate_pkey" PRIMARY KEY ("farePolicyId", "categoryCode")
);

-- AlterTable
ALTER TABLE "Ride"
ADD COLUMN "farePolicyId" TEXT,
ADD COLUMN "farePolicyVersion" INTEGER,
ADD COLUMN "fareMultiplier" DECIMAL(5,2),
ADD COLUMN "routeDistanceMeters" INTEGER,
ADD COLUMN "routeDurationSeconds" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "FarePolicy_cityId_version_key" ON "FarePolicy"("cityId", "version");
CREATE INDEX "FarePolicy_cityId_active_idx" ON "FarePolicy"("cityId", "active");
CREATE UNIQUE INDEX "FarePolicy_one_active_per_city" ON "FarePolicy"("cityId") WHERE "active" = true;

-- AddForeignKey
ALTER TABLE "FarePolicy" ADD CONSTRAINT "FarePolicy_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FarePolicyCategoryRate" ADD CONSTRAINT "FarePolicyCategoryRate_farePolicyId_fkey" FOREIGN KEY ("farePolicyId") REFERENCES "FarePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_farePolicyId_fkey" FOREIGN KEY ("farePolicyId") REFERENCES "FarePolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
