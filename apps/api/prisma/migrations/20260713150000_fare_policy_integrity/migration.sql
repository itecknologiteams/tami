-- Keep pricing and payment audit data within calculable, auditable bounds.
ALTER TABLE "FarePolicy"
  ADD CONSTRAINT "FarePolicy_version_positive" CHECK ("version" > 0),
  ADD CONSTRAINT "FarePolicy_amounts_nonnegative" CHECK (
    "baseFareMinor" >= 0 AND
    "perKilometerMinor" >= 0 AND
    "perMinuteMinor" >= 0 AND
    "bookingFeeMinor" >= 0 AND
    "minimumFareMinor" >= 0
  ),
  ADD CONSTRAINT "FarePolicy_multipliers_positive" CHECK (
    "demandMultiplier" > 0 AND
    "maximumMultiplier" > 0 AND
    "roadFactor" > 0 AND
    "averageSpeedKph" > 0
  ),
  ADD CONSTRAINT "FarePolicy_maximum_multiplier_valid" CHECK (
    "maximumMultiplier" >= "demandMultiplier"
  ),
  ADD CONSTRAINT "FarePolicy_maximum_fare_valid" CHECK (
    "maximumFareMinor" IS NULL OR "maximumFareMinor" >= "minimumFareMinor"
  );

ALTER TABLE "FarePolicyCategoryRate"
  ADD CONSTRAINT "FarePolicyCategoryRate_multiplier_positive" CHECK ("multiplier" > 0);

ALTER TABLE "Ride"
  ADD CONSTRAINT "Ride_fare_audit_amounts_nonnegative" CHECK (
    ("estimatedFareMinor" IS NULL OR "estimatedFareMinor" >= 0) AND
    ("finalFareMinor" IS NULL OR "finalFareMinor" >= 0)
  );

ALTER TABLE "PaymentRecord"
  ADD CONSTRAINT "PaymentRecord_amount_nonnegative" CHECK ("amountMinor" >= 0);
