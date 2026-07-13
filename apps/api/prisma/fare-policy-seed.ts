import { PrismaClient } from "@prisma/client";

export type SeedCity = {
  name: string;
  slug: string;
};

const categoryMultipliers = {
  standard_taxi: 1,
  women_family_preferred: 1.1,
  airport: 1.35,
  accessible_special_assistance: 1.15,
  government_staff_movement: 1,
  scheduled_ride: 1.05,
} as const;

type FarePolicySeedClient = Pick<PrismaClient, "city" | "farePolicy">;

export async function seedMissingBaselineFarePolicies(
  prisma: FarePolicySeedClient,
  cities: readonly SeedCity[],
): Promise<void> {
  for (const city of cities) {
    const persistedCity = await prisma.city.findUniqueOrThrow({
      where: {slug: city.slug},
    });
    const existingPolicy = await prisma.farePolicy.findFirst({
      where: {cityId: persistedCity.id},
      select: {id: true},
    });
    if (existingPolicy != null) {
      continue;
    }

    await prisma.farePolicy.create({
      data: {
        cityId: persistedCity.id,
        version: 1,
        name: `${city.name} transparent fare v1`,
        active: true,
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
        effectiveFrom: new Date("2026-07-13T00:00:00.000Z"),
        categoryRates: {
          create: Object.entries(categoryMultipliers).map(
            ([categoryCode, multiplier]) => ({
              categoryCode: categoryCode as keyof typeof categoryMultipliers,
              multiplier,
            }),
          ),
        },
      },
    });
  }
}
