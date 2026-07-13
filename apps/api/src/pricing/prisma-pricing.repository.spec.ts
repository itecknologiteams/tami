import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { PrismaPricingRepository } from "./prisma-pricing.repository";

function createPrismaFake() {
  return {
    rideCategory: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    farePolicy: {
      findMany: vi.fn(),
    },
  };
}

describe("PrismaPricingRepository", () => {
  it("returns only active categories priced by the city policy", async () => {
    const prisma = createPrismaFake();
    prisma.rideCategory.findMany.mockResolvedValue([
      {
        code: "airport",
        name: "Airport",
        description: "Airport rides.",
      },
      {
        code: "standard_taxi",
        name: "Standard Taxi",
        description: "General rides.",
      },
    ]);
    prisma.rideCategory.findFirst.mockResolvedValue({code: "scheduled_ride"});
    const repository = new PrismaPricingRepository(prisma as never);
    vi.spyOn(repository, "findActivePolicyForCity").mockResolvedValue({
      id: "policy_1",
      cityId: "city_karachi",
      version: 1,
      name: "Karachi v1",
      active: true,
      currency: "PKR",
      baseFareMinor: 0,
      perKilometerMinor: 0,
      perMinuteMinor: 0,
      bookingFeeMinor: 0,
      minimumFareMinor: 0,
      demandMultiplier: 1,
      maximumMultiplier: 2,
      maximumFareMinor: null,
      roadFactor: 1,
      averageSpeedKph: 24,
      effectiveFrom: "2026-07-13T00:00:00.000Z",
      categoryRates: {
        standard_taxi: 1,
        airport: 1.2,
        scheduled_ride: 1.05,
      },
    });

    await expect(repository.findAvailableCategories("city_karachi")).resolves.toEqual({
      categories: [
        expect.objectContaining({code: "standard_taxi"}),
        expect.objectContaining({code: "airport"}),
      ],
      scheduledRidesEnabled: true,
    });
    expect(prisma.rideCategory.findMany).toHaveBeenCalledWith({
      where: {
        active: true,
        code: {in: ["standard_taxi", "airport"]},
      },
      select: {code: true, name: true, description: true},
    });
  });

  it("returns an active ride category code", async () => {
    const prisma = createPrismaFake();
    prisma.rideCategory.findFirst.mockResolvedValue({ code: "standard_taxi" });
    const repository = new PrismaPricingRepository(prisma as never);

    await expect(repository.findActiveCategory("standard_taxi")).resolves.toEqual({
      code: "standard_taxi",
    });
    expect(prisma.rideCategory.findFirst).toHaveBeenCalledWith({
      where: { code: "standard_taxi", active: true },
      select: { code: true },
    });
  });

  it("returns a single active fare policy with category rates", async () => {
    const prisma = createPrismaFake();
    prisma.farePolicy.findMany.mockResolvedValue([
      {
        id: "policy_1",
        cityId: "city_karachi",
        version: 1,
        name: "Karachi v1",
        active: true,
        currency: "PKR",
        baseFareMinor: 20000,
        perKilometerMinor: 3500,
        perMinuteMinor: 500,
        bookingFeeMinor: 2000,
        minimumFareMinor: 25000,
        demandMultiplier: new Prisma.Decimal("1.00"),
        maximumMultiplier: new Prisma.Decimal("2.00"),
        maximumFareMinor: 1000000,
        roadFactor: new Prisma.Decimal("1.25"),
        averageSpeedKph: 24,
        effectiveFrom: new Date("2026-07-13T00:00:00.000Z"),
        categoryRates: [
          {
            categoryCode: "standard_taxi",
            multiplier: new Prisma.Decimal("1.00"),
          },
          {
            categoryCode: "women_family_preferred",
            multiplier: new Prisma.Decimal("1.10"),
          },
        ],
      },
    ]);
    const repository = new PrismaPricingRepository(prisma as never);

    await expect(repository.findActivePolicyForCity("city_karachi")).resolves.toEqual({
      id: "policy_1",
      cityId: "city_karachi",
      version: 1,
      name: "Karachi v1",
      active: true,
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
      effectiveFrom: "2026-07-13T00:00:00.000Z",
      categoryRates: {
        standard_taxi: 1,
        women_family_preferred: 1.1,
      },
    });
  });

  it("rejects multiple active policies for the same city", async () => {
    const prisma = createPrismaFake();
    prisma.farePolicy.findMany.mockResolvedValue([
      { id: "policy_1", categoryRates: [] },
      { id: "policy_2", categoryRates: [] },
    ]);
    const repository = new PrismaPricingRepository(prisma as never);

    await expect(
      repository.findActivePolicyForCity("city_karachi"),
    ).rejects.toThrow("Expected at most one active fare policy for city city_karachi");
  });
});
