import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { BookingService } from "./booking.service";
import { PrismaBookingRepository } from "./prisma-booking.repository";
import { createIntegrationFarePolicy } from "../pricing/pricing.integration-fixture";
import { PrismaPricingRepository } from "../pricing/prisma-pricing.repository";
import { PricingService } from "../pricing/pricing.service";
import { createTestRoutingService } from "../routing/routing.test-fixture";

const describeDatabase =
  process.env.RUN_DATABASE_TESTS === "true" ? describe : describe.skip;

describeDatabase("PrismaBookingRepository integration", () => {
  const prisma = new PrismaClient();
  const suffix = randomUUID();
  let cityId: string;
  let riderId: string;
  let farePolicyId: string;

  beforeAll(async () => {
    await prisma.$connect();

    const city = await prisma.city.create({
      data: {
        name: "Integration Test City",
        slug: `integration-${suffix}`,
      },
    });
    cityId = city.id;
    farePolicyId = await createIntegrationFarePolicy(prisma, cityId, suffix);

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
      await prisma.paymentRecord.deleteMany({where: {ride: {riderId}}});
      await prisma.ride.deleteMany({ where: { riderId } });
      await prisma.rider.deleteMany({ where: { id: riderId } });
    }

    if (cityId) {
      await prisma.farePolicy.deleteMany({where: {id: farePolicyId}});
      await prisma.city.deleteMany({ where: { id: cityId } });
    }

    await prisma.$disconnect();
  });

  it("persists fare audit fields, requested transition, and pending payment", async () => {
    const service = new BookingService(
      new PrismaBookingRepository(prisma as never),
      new PricingService(
        new PrismaPricingRepository(prisma as never),
        createTestRoutingService(),
      ),
    );

    const request = {
      cityId,
      riderId,
      idempotencyKey: "prisma_integration_request_01",
      categoryCode: "standard_taxi" as const,
      paymentMethod: "cash" as const,
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
    };
    const ride = await service.createRide(request);
    const retriedRide = await service.createRide(request);

    const storedRide = await prisma.ride.findUniqueOrThrow({
      where: { id: ride.id },
      include: { category: true, transitions: true, payments: true },
    });

    expect(storedRide.state).toBe("requested");
    expect(retriedRide.id).toBe(ride.id);
    expect(storedRide.category.code).toBe("standard_taxi");
    expect(storedRide.pickupLatitude.toNumber()).toBe(24.8607);
    expect(storedRide.destinationLongitude.toNumber()).toBe(67.05);
    expect(storedRide.estimatedFareMinor).toBe(ride.estimatedFareMinor);
    expect(storedRide.currency).toBe("PKR");
    expect(storedRide.farePolicyId).toBe(farePolicyId);
    expect(storedRide.farePolicyVersion).toBe(1);
    expect(storedRide.fareMultiplier?.toNumber()).toBe(1);
    expect(storedRide.routeDistanceMeters).toBeGreaterThan(0);
    expect(storedRide.routeDurationSeconds).toBeGreaterThan(0);
    expect(storedRide.transitions).toEqual([
      expect.objectContaining({
        fromState: null,
        toState: "requested",
        actorType: "rider",
        actorId: riderId,
      }),
    ]);
    expect(storedRide.payments).toEqual([
      expect.objectContaining({
        method: "cash",
        status: "pending",
        amountMinor: ride.estimatedFareMinor,
        currency: "PKR",
      }),
    ]);
    expect(await prisma.ride.count({where: {riderId}})).toBe(1);

    const concurrentRequest = {
      ...request,
      idempotencyKey: "prisma_integration_concurrent_01",
    };
    const [concurrentFirst, concurrentSecond] = await Promise.all([
      service.createRide(concurrentRequest),
      service.createRide(concurrentRequest),
    ]);
    expect(concurrentSecond.id).toBe(concurrentFirst.id);
    expect(await prisma.ride.count({where: {riderId}})).toBe(2);
  });

  it("rolls back the ride and transition when payment creation fails", async () => {
    const failingPrisma = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        prisma.$transaction(async (transaction) =>
          callback(
            new Proxy(transaction, {
              get(target, property, receiver) {
                if (property !== "paymentRecord") {
                  return Reflect.get(target, property, receiver);
                }
                return new Proxy(target.paymentRecord, {
                  get(paymentTarget, paymentProperty, paymentReceiver) {
                    if (paymentProperty === "create") {
                      return async () => {
                        throw new Error("payment provider is unavailable");
                      };
                    }
                    return Reflect.get(
                      paymentTarget,
                      paymentProperty,
                      paymentReceiver,
                    );
                  },
                });
              },
            }),
          ),
        ),
    };
    const repository = new PrismaBookingRepository(failingPrisma as never);
    const before = {
      rides: await prisma.ride.count({where: {riderId}}),
      transitions: await prisma.rideStateTransition.count({
        where: {ride: {riderId}},
      }),
    };

    await expect(
      repository.createRideWithInitialTransition(
        {
          cityId,
          riderId,
          idempotencyKey: "prisma_integration_request_02",
          categoryCode: "standard_taxi",
          paymentMethod: "cash",
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
          estimatedFareMinor: 51_200,
          currency: "PKR",
          farePolicyId,
          farePolicyVersion: 1,
          fareMultiplier: 1,
          routeDistanceMeters: 6_200,
          routeDurationSeconds: 930,
        },
        new Date().toISOString(),
      ),
    ).rejects.toThrow("payment provider is unavailable");

    await expect(prisma.ride.count({where: {riderId}})).resolves.toBe(before.rides);
    await expect(
      prisma.rideStateTransition.count({where: {ride: {riderId}}}),
    ).resolves.toBe(before.transitions);
  });

  it("rejects invalid fare policy values at the database boundary", async () => {
    try {
      await expect(
        prisma.farePolicy.create({
          data: {
            cityId,
            version: 2,
            name: "Invalid negative fare policy",
            active: false,
            baseFareMinor: -1,
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
          },
        }),
      ).rejects.toThrow("FarePolicy_amounts_nonnegative");
      await expect(
        prisma.farePolicy.create({
          data: {
            cityId,
            version: 3,
            name: "Invalid capped fare policy",
            active: false,
            baseFareMinor: 20_000,
            perKilometerMinor: 3_500,
            perMinuteMinor: 500,
            bookingFeeMinor: 2_000,
            minimumFareMinor: 25_000,
            demandMultiplier: 1,
            maximumMultiplier: 2,
            maximumFareMinor: 24_999,
            roadFactor: 1.25,
            averageSpeedKph: 24,
            effectiveFrom: new Date("2020-01-01T00:00:00.000Z"),
          },
        }),
      ).rejects.toThrow("FarePolicy_maximum_fare_valid");
    } finally {
      await prisma.farePolicy.deleteMany({
        where: {cityId, version: {in: [2, 3]}},
      });
    }
  });

  it("rejects zero and negative category multipliers at the database boundary", async () => {
    await expect(
      prisma.farePolicyCategoryRate.update({
        where: {
          farePolicyId_categoryCode: {
            farePolicyId,
            categoryCode: "standard_taxi",
          },
        },
        data: {multiplier: 0},
      }),
    ).rejects.toThrow("FarePolicyCategoryRate_multiplier_positive");
    await expect(
      prisma.farePolicyCategoryRate.update({
        where: {
          farePolicyId_categoryCode: {
            farePolicyId,
            categoryCode: "standard_taxi",
          },
        },
        data: {multiplier: -1},
      }),
    ).rejects.toThrow("FarePolicyCategoryRate_multiplier_positive");
  });

  it("rejects negative ride fare audit and payment amounts at the database boundary", async () => {
    const ride = await prisma.ride.create({
      data: {
        city: {connect: {id: cityId}},
        rider: {connect: {id: riderId}},
        category: {connect: {code: "standard_taxi"}},
        state: "requested",
        pickupLatitude: 24.8607,
        pickupLongitude: 67.0011,
        pickupAddress: "Frere Hall, Karachi",
        destinationLatitude: 24.8425,
        destinationLongitude: 67.05,
        destinationAddress: "Mazar-e-Quaid, Karachi",
        estimatedFareMinor: 51_200,
        finalFareMinor: 51_200,
        farePolicy: {connect: {id: farePolicyId}},
        farePolicyVersion: 1,
        fareMultiplier: 1,
        routeDistanceMeters: 6_200,
        routeDurationSeconds: 930,
      },
    });
    try {
      await expect(
        prisma.ride.update({
          where: {id: ride.id},
          data: {estimatedFareMinor: -1},
        }),
      ).rejects.toThrow("Ride_fare_audit_amounts_nonnegative");
      await expect(
        prisma.paymentRecord.create({
          data: {
            rideId: ride.id,
            method: "cash",
            status: "pending",
            amountMinor: -1,
            currency: "PKR",
          },
        }),
      ).rejects.toThrow("PaymentRecord_amount_nonnegative");
    } finally {
      await prisma.paymentRecord.deleteMany({where: {rideId: ride.id}});
      await prisma.ride.delete({where: {id: ride.id}});
    }
  });
});
