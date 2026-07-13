import { InMemoryPricingRepository } from "./in-memory-pricing.repository";
import { PricingService } from "./pricing.service";
import { PricingPolicy } from "./pricing.types";
import { createTestRoutingService } from "../routing/routing.test-fixture";

export function createTestPricingPolicy(
  cityId = "city_karachi",
  id = "policy_1",
): PricingPolicy {
  return {
    id,
    cityId,
    version: 1,
    currency: "PKR",
    baseFareMinor: 20_000,
    perKilometerMinor: 3_500,
    perMinuteMinor: 500,
    bookingFeeMinor: 2_000,
    minimumFareMinor: 25_000,
    demandMultiplier: 1,
    maximumMultiplier: 2,
    maximumFareMinor: 1_000_000,
    roadFactor: 1.25,
    averageSpeedKph: 24,
    categoryMultiplier: 1,
  };
}

export function createTestPricingService(
  cityId = "city_karachi",
  id = "policy_1",
): PricingService {
  return new PricingService(
    new InMemoryPricingRepository([createTestPricingPolicy(cityId, id)]),
    createTestRoutingService(),
  );
}
