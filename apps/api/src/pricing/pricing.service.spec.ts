import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { InMemoryPricingRepository } from "./in-memory-pricing.repository";
import { PricingService } from "./pricing.service";
import { PricingPolicy } from "./pricing.types";

const policy: PricingPolicy = {
  id: "policy_1",
  cityId: "city_karachi",
  version: 3,
  currency: "PKR",
  baseFareMinor: 10000,
  perKilometerMinor: 1000,
  perMinuteMinor: 600,
  bookingFeeMinor: 500,
  minimumFareMinor: 15000,
  demandMultiplier: 1.8,
  maximumMultiplier: 2,
  maximumFareMinor: 20000,
  roadFactor: 1,
  averageSpeedKph: 60,
  categoryMultiplier: 1.2,
};

const request = {
  cityId: "city_karachi",
  categoryCode: "standard_taxi" as const,
  pickup: {latitude: 0, longitude: 0, address: "Pickup"},
  destination: {latitude: 0, longitude: 0.01, address: "Destination"},
};

describe("PricingService", () => {
  it("caps multipliers and the final fare using an auditable policy", async () => {
    const service = new PricingService(new InMemoryPricingRepository([policy]));

    const estimate = await service.estimateFare(request);

    expect(estimate).toEqual(
      expect.objectContaining({
        fareMinor: 20000,
        currency: "PKR",
        policyId: "policy_1",
        policyVersion: 3,
        routeMethod: "great_circle_road_factor_v1",
        multiplier: 2,
        capApplied: true,
      }),
    );
    expect(estimate.distanceMeters).toBeGreaterThan(1100);
    expect(estimate.durationSeconds).toBeGreaterThan(60);
    expect(estimate.explanationLines).toContain("Policy version 3");
  });

  it("applies the minimum fare for a short trip", async () => {
    const service = new PricingService(
      new InMemoryPricingRepository([
        {
          ...policy,
          demandMultiplier: 1,
          categoryMultiplier: 1,
          maximumFareMinor: null,
        },
      ]),
    );

    const estimate = await service.estimateFare({
      ...request,
      destination: {latitude: 0, longitude: 0.001, address: "Nearby"},
    });

    expect(estimate.fareMinor).toBe(15000);
    expect(estimate.capApplied).toBe(false);
    expect(estimate.explanationLines).toContain("Minimum fare applied");
  });

  it("rejects malformed coordinates, addresses, and identical points", async () => {
    const service = new PricingService(new InMemoryPricingRepository([policy]));

    await expect(
      service.estimateFare({...request, pickup: {...request.pickup, latitude: 91}}),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.estimateFare({...request, destination: {...request.destination, address: " "}}),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.estimateFare({...request, destination: {...request.pickup}}),
    ).rejects.toThrow("Pickup and destination must be different");
  });

  it("rejects missing and unsupported category values at the service boundary", async () => {
    const service = new PricingService(new InMemoryPricingRepository([policy]));

    await expect(
      service.estimateFare({...request, categoryCode: undefined} as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.estimateFare({...request, categoryCode: "luxury"} as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("validates matching scheduled category and timestamp before pricing", async () => {
    const service = new PricingService(new InMemoryPricingRepository([policy]));
    const scheduledPickupAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await expect(
      service.estimateFare({...request, scheduledPickupAt}),
    ).rejects.toThrow("Scheduled pickup time requires scheduled_ride category");
    await expect(
      service.estimateFare({...request, categoryCode: "scheduled_ride"}),
    ).rejects.toThrow("Scheduled rides require a pickup time");
  });

  it("rejects non-string scheduled pickup values before parsing", async () => {
    const service = new PricingService(new InMemoryPricingRepository([policy]));

    await expect(
      service.estimateFare({
        ...request,
        categoryCode: "scheduled_ride",
        scheduledPickupAt: [
          new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        ],
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects invalid loaded fare policy values before calculating", async () => {
    const service = new PricingService(
      new InMemoryPricingRepository([{...policy, maximumFareMinor: 10_000}]),
    );

    await expect(service.estimateFare(request)).rejects.toThrow(
      "Active fare policy is invalid",
    );
  });

  it("fails when the rider city has no active category policy", async () => {
    const service = new PricingService(new InMemoryPricingRepository([]));

    await expect(service.estimateFare(request)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
