import { describe, expect, it, vi } from "vitest";
import { PrismaBookingRepository } from "./prisma-booking.repository";
import {
  BookingRideTransition,
  CreateRideRequest,
} from "./booking.types";

const requestedAt = "2026-07-10T10:00:00.000Z";

const baseRequest: CreateRideRequest = {
  cityId: "city_karachi",
  riderId: "rider_123",
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
      }),
    },
    rideStateTransition: {
      create: vi.fn().mockResolvedValue({
        id: "transition_123",
        ...requestedTransition,
        occurredAt: new Date(requestedAt),
      }),
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
      },
      include: { category: true },
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
