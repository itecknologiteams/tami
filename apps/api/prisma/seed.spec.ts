import { describe, expect, it, vi } from "vitest";
import { seedMissingBaselineFarePolicies } from "./fare-policy-seed";

describe("fare policy seed safety", () => {
  it("preserves an existing admin-managed policy on rerun", async () => {
    const adminPolicy = Object.freeze({
      id: "admin_policy_v2",
      version: 2,
      active: true,
    });
    const prisma = createPrismaFake({existingPolicy: adminPolicy});

    await seedMissingBaselineFarePolicies(prisma as never, [testCity]);

    expect(prisma.farePolicy.create).not.toHaveBeenCalled();
    expect(prisma.farePolicy.update).not.toHaveBeenCalled();
    expect(prisma.farePolicy.updateMany).not.toHaveBeenCalled();
    expect(adminPolicy).toEqual({
      id: "admin_policy_v2",
      version: 2,
      active: true,
    });
  });

  it("creates a complete active v1 baseline when a city has no policy", async () => {
    const prisma = createPrismaFake({existingPolicy: null});

    await seedMissingBaselineFarePolicies(prisma as never, [testCity]);

    expect(prisma.farePolicy.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cityId: "city_karachi",
        version: 1,
        name: "Karachi transparent fare v1",
        active: true,
        currency: "PKR",
        baseFareMinor: 20_000,
        minimumFareMinor: 25_000,
        categoryRates: {
          create: expect.arrayContaining([
            {categoryCode: "standard_taxi", multiplier: 1},
            {categoryCode: "scheduled_ride", multiplier: 1.05},
          ]),
        },
      }),
    });
  });
});

const testCity = {name: "Karachi", slug: "karachi"};

function createPrismaFake({existingPolicy}: {existingPolicy: unknown}) {
  return {
    city: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({id: "city_karachi"}),
    },
    farePolicy: {
      findFirst: vi.fn().mockResolvedValue(existingPolicy),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}
