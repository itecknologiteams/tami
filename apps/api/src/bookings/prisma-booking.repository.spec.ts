import { describe, expect, it, vi } from "vitest";
import { PrismaBookingRepository } from "./prisma-booking.repository";
import {
  BookingRideTransition,
  PersistRideForRiderRequest,
} from "./booking.types";

const requestedAt = "2026-07-10T10:00:00.000Z";

const baseRequest: PersistRideForRiderRequest = {
  cityId: "city_karachi",
  riderId: "rider_123",
  idempotencyKey: "prisma_repository_request_01",
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
  paymentMethod: "cash",
  estimatedFareMinor: 51200,
  currency: "PKR",
  farePolicyId: "policy_1",
  farePolicyVersion: 1,
  fareMultiplier: 1,
  routeDistanceMeters: 6200,
  routeDurationSeconds: 930,
};

const requestedTransition: Omit<BookingRideTransition, "id"> = {
  rideId: "ride_123",
  fromState: null,
  toState: "requested",
  actorType: "rider",
  actorId: "rider_123",
  occurredAt: requestedAt,
};

function createPrismaFake() {
  const transactionClient = {
    ride: {
      create: vi.fn().mockResolvedValue({
        id: "ride_123",
        cityId: "city_karachi",
        riderId: "rider_123",
        category: { code: "standard_taxi" },
        state: "requested",
        pickupLatitude: 24.8607,
        pickupLongitude: 67.0011,
        pickupAddress: "Frere Hall, Karachi",
        destinationLatitude: 24.8425,
        destinationLongitude: 67.05,
        destinationAddress: "Mazar-e-Quaid, Karachi",
        scheduledPickupAt: null,
        requestedAt: new Date(requestedAt),
        estimatedFareMinor: 51200,
        currency: "PKR",
        farePolicyVersion: 1,
        payments: [],
      }),
    },
    rideStateTransition: {
      create: vi.fn().mockResolvedValue({
        id: "transition_123",
        ...requestedTransition,
        occurredAt: new Date(requestedAt),
      }),
    },
    paymentRecord: {
      create: vi.fn().mockResolvedValue({id: "payment_123"}),
    },
  };

  return {
    ...transactionClient,
    $transaction: vi.fn(
      async (
        callback: (client: typeof transactionClient) => Promise<unknown>,
      ) => callback(transactionClient),
    ),
  };
}

describe("PrismaBookingRepository", () => {
  it("creates a requested ride and audit transition in one transaction", async () => {
    const prisma = createPrismaFake();
    const repository = new PrismaBookingRepository(prisma as never);

    const ride = await repository.createRideWithInitialTransition(
      baseRequest,
      requestedAt,
    );

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.ride.create).toHaveBeenCalledWith({
      data: {
        idempotencyKey: "prisma_repository_request_01",
        city: { connect: { id: "city_karachi" } },
        rider: { connect: { id: "rider_123" } },
        category: { connect: { code: "standard_taxi" } },
        state: "requested",
        pickupLatitude: 24.8607,
        pickupLongitude: 67.0011,
        pickupAddress: "Frere Hall, Karachi",
        destinationLatitude: 24.8425,
        destinationLongitude: 67.05,
        destinationAddress: "Mazar-e-Quaid, Karachi",
        scheduledPickupAt: null,
        requestedAt: new Date(requestedAt),
        estimatedFareMinor: 51200,
        currency: "PKR",
        farePolicy: {connect: {id: "policy_1"}},
        farePolicyVersion: 1,
        fareMultiplier: 1,
        routeDistanceMeters: 6200,
        routeDurationSeconds: 930,
      },
      include: {
        category: true,
        payments: {orderBy: {createdAt: "desc"}, take: 1},
      },
    });
    expect(prisma.rideStateTransition.create).toHaveBeenCalledWith({
      data: {
        rideId: "ride_123",
        fromState: null,
        toState: "requested",
        actorType: "rider",
        actorId: "rider_123",
        occurredAt: new Date(requestedAt),
      },
    });
    expect(prisma.paymentRecord.create).toHaveBeenCalledWith({
      data: {
        rideId: "ride_123",
        method: "cash",
        status: "pending",
        amountMinor: 51200,
        currency: "PKR",
      },
    });
    expect(ride).toEqual({
      id: "ride_123",
      cityId: "city_karachi",
      riderId: "rider_123",
      categoryCode: "standard_taxi",
      state: "requested",
      pickup: baseRequest.pickup,
      destination: baseRequest.destination,
      scheduledPickupAt: null,
      requestedAt,
      estimatedFareMinor: 51200,
      currency: "PKR",
      farePolicyVersion: 1,
      paymentMethod: "cash",
    });
  });

  it("writes the requested audit transition", async () => {
    const prisma = createPrismaFake();
    const repository = new PrismaBookingRepository(prisma as never);

    const transition = await repository.recordTransition(requestedTransition);

    expect(prisma.rideStateTransition.create).toHaveBeenCalledWith({
      data: {
        rideId: "ride_123",
        fromState: null,
        toState: "requested",
        actorType: "rider",
        actorId: "rider_123",
        occurredAt: new Date(requestedAt),
      },
    });
    expect(transition).toEqual({
      id: "transition_123",
      ...requestedTransition,
    });
  });
});
