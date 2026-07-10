import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { BookingService } from "../bookings/booking.service";
import { PrismaBookingRepository } from "../bookings/prisma-booking.repository";
import { AuthService } from "./auth.service";
import { DevelopmentOtpStore } from "./development-otp-store";
import { PrismaAuthRepository } from "./prisma-auth.repository";

const describeDatabase =
  process.env.RUN_DATABASE_TESTS === "true" ? describe : describe.skip;

describeDatabase("rider authentication integration", () => {
  const prisma = new PrismaClient();
  const suffix = randomUUID();
  let cityId: string;
  let riderId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const city = await prisma.city.create({
      data: {
        name: "Auth Integration City",
        slug: `auth-integration-${suffix}`,
      },
    });
    cityId = city.id;
  });

  afterAll(async () => {
    if (cityId) {
      await prisma.rideStateTransition.deleteMany({
        where: { ride: { cityId } },
      });
      await prisma.ride.deleteMany({ where: { cityId } });
      await prisma.riderSession.deleteMany({ where: { rider: { cityId } } });
      await prisma.rider.deleteMany({ where: { cityId } });
      await prisma.city.deleteMany({ where: { id: cityId } });
    }
    await prisma.$disconnect();
  });

  it("persists a hashed session for a rider-owned booking", async () => {
    const authService = new AuthService(
      new PrismaAuthRepository(prisma as never),
      new DevelopmentOtpStore(),
    );
    const challenge = await authService.requestOtp("+923001234567");
    const session = await authService.verifyRider({
      challengeId: challenge.challengeId,
      code: challenge.developmentCode,
      cityId,
    });
    riderId = session.rider.id;

    const authenticatedRider = await authService.authenticate(
      session.accessToken,
    );
    const ride = await new BookingService(
      new PrismaBookingRepository(prisma as never),
    ).createRide({
      cityId: authenticatedRider.cityId,
      riderId: authenticatedRider.id,
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

    const storedSession = await prisma.riderSession.findFirstOrThrow({
      where: { riderId },
    });

    expect(storedSession.tokenHash).not.toBe(session.accessToken);
    expect(ride.riderId).toBe(riderId);
    expect(ride.cityId).toBe(cityId);
  });
});
