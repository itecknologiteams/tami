import { describe, expect, it } from "vitest";
import { InMemoryPricingRepository } from "./in-memory-pricing.repository";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";
import { PricingPolicy } from "./pricing.types";

const policy: PricingPolicy = {
  id: "policy_1",
  cityId: "city_karachi",
  version: 1,
  currency: "PKR",
  baseFareMinor: 20000,
  perKilometerMinor: 3500,
  perMinuteMinor: 500,
  bookingFeeMinor: 2000,
  minimumFareMinor: 25000,
  demandMultiplier: 1,
  maximumMultiplier: 2,
  maximumFareMinor: 1000000,
  roadFactor: 1.25,
  averageSpeedKph: 24,
  categoryMultiplier: 1,
};

describe("PricingController", () => {
  it("uses the authenticated rider city instead of request ownership fields", async () => {
    const controller = new PricingController(
      new PricingService(new InMemoryPricingRepository([policy])),
    );

    const estimate = await controller.estimateFare(
      {id: "rider_1", cityId: "city_karachi", phone: "+923001234567"},
      {
        categoryCode: "standard_taxi",
        pickup: {latitude: 24.86, longitude: 67.01, address: "Pickup"},
        destination: {
          latitude: 24.88,
          longitude: 67.05,
          address: "Destination",
        },
        cityId: "city_other",
      } as never,
    );

    expect(estimate.policyId).toBe("policy_1");
  });
});
