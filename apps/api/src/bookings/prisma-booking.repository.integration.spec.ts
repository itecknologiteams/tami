import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { BookingService } from "./booking.service";
import { PrismaBookingRepository } from "./prisma-booking.repository";

const describeDatabase =
  process.env.RUN_DATABASE_TESTS === "true" ? describe : describe.skip;

describeDatabase("PrismaBookingRepository integration", () => {
  const prisma = new PrismaClient();
  const suffix = randomUUID();
  let cityId: string;
  let riderId: string;

  beforeAll(async () => {
    await prisma.$connect();

    const city = await prisma.city.create({
      data: {
        name: "Integration Test City",
        slug: `integration-${suffix}`,
      },
    });
    cityId = city.id;

    const rider = await prisma.rider.create({
      data: {
        cityId,
        phone: `+92300${suffix.replaceAll("-", "").slice(0, 7)}`,
        name: "Integration Rider",
      },
    });
    riderId = rider.id;
  });

  afterAll(async () => {
    if (riderId) {
      await prisma.rideStateTransition.deleteMany({
        where: { ride: { riderId } },
      });
      await prisma.ride.deleteMany({ where: { riderId } });
      await prisma.rider.deleteMany({ where: { id: riderId } });
    }

    if (cityId) {
      await prisma.city.deleteMany({ where: { id: cityId } });
    }

    await prisma.$disconnect();
  });

  it("persists a requested ride and rider audit transition", async () => {
    const service = new BookingService(
      new PrismaBookingRepository(prisma as never),
    );

    const ride = await service.createRide({
      cityId,
      riderId,
      categoryCode: "standard_taxi",
      pickup: {
        latitude: 24.8607,
        longitude: 67.0011,
        address: "Frere Hall, Karachi",
      },
      destination: {
        latitude: 24.8425,
        longitude: 67.05,
        address: "Mazar-e-Quaid, Karachi",
      },
    });

    const storedRide = await prisma.ride.findUniqueOrThrow({
      where: { id: ride.id },
      include: { category: true, transitions: true },
    });

    expect(storedRide.state).toBe("requested");
    expect(storedRide.category.code).toBe("standard_taxi");
    expect(storedRide.pickupLatitude.toNumber()).toBe(24.8607);
    expect(storedRide.destinationLongitude.toNumber()).toBe(67.05);
    expect(storedRide.transitions).toEqual([
      expect.objectContaining({
        fromState: null,
        toState: "requested",
        actorType: "rider",
        actorId: riderId,
      }),
    ]);
  });
});
