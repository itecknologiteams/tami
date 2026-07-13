import { PrismaClient } from "@prisma/client";

export async function createIntegrationFarePolicy(
  prisma: PrismaClient,
  cityId: string,
  suffix: string,
): Promise<string> {
  const policy = await prisma.farePolicy.create({
    data: {
      cityId,
      version: 1,
      name: `Integration policy ${suffix}`,
      active: true,
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
      effectiveFrom: new Date("2020-01-01T00:00:00.000Z"),
      categoryRates: {
        create: {categoryCode: "standard_taxi", multiplier: 1},
      },
    },
  });
  return policy.id;
}
