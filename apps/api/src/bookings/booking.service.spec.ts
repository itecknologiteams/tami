import { describe, expect, it } from "vitest";
import { BookingService } from "./booking.service";
import { InMemoryBookingRepository } from "./in-memory-booking.repository";
import { InMemoryPricingRepository } from "../pricing/in-memory-pricing.repository";
import { PricingService } from "../pricing/pricing.service";
import { createTestRoutingService } from "../routing/routing.test-fixture";
import { PricingPolicy } from "../pricing/pricing.types";

const baseRequest = {
  cityId: "city_karachi",
  riderId: "rider_123",
  idempotencyKey: "request_1234567890abcdef",
  categoryCode: "standard_taxi" as const,
  pickup: {
    latitude: 24.8607,
    longitude: 67.0011,
    address: "Frere Hall, Karachi",
  },
  destination: {
    latitude: 24.8425,
    longitude: 67.0500,
    address: "Mazar-e-Quaid, Karachi",
  },
  paymentMethod: "cash" as const,
};

const pricingPolicy: PricingPolicy = {
  id: "policy_1",
  cityId: "city_karachi",
  version: 1,
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
  categoryMultiplier: 1,
};

function createService(repository: InMemoryBookingRepository) {
  return new BookingService(
    repository,
    new PricingService(
      new InMemoryPricingRepository([pricingPolicy]),
      createTestRoutingService(),
    ),
  );
}

describe("BookingService", () => {
  it("creates an immediate ride in requested state with an audit transition", async () => {
    const repository = new InMemoryBookingRepository();
    const service = createService(repository);

    const ride = await service.createRide(baseRequest);

    expect(ride.state).toBe("requested");
    expect(ride.cityId).toBe("city_karachi");
    expect(ride.scheduledPickupAt).toBeNull();
    expect(ride.estimatedFareMinor).toBeGreaterThan(0);
    expect(ride.farePolicyVersion).toBe(1);
    expect(ride.paymentMethod).toBe("cash");
    expect(repository.payments).toEqual([
      expect.objectContaining({
        rideId: ride.id,
        method: "cash",
        status: "pending",
        amountMinor: ride.estimatedFareMinor,
        currency: "PKR",
      }),
    ]);
    expect(repository.transitions).toEqual([
      expect.objectContaining({
        rideId: ride.id,
        fromState: null,
        toState: "requested",
        actorType: "rider",
        actorId: "rider_123",
      }),
    ]);
  });

  it("returns the original ride when a rider retries the same request", async () => {
    const repository = new InMemoryBookingRepository();
    const service = createService(repository);

    const first = await service.createRide(baseRequest);
    const retried = await service.createRide(baseRequest);

    expect(retried.id).toBe(first.id);
    expect(repository.rides).toHaveLength(1);
    expect(repository.transitions).toHaveLength(1);
    expect(repository.payments).toHaveLength(1);
  });

  it("creates a scheduled ride with a scheduled pickup time", async () => {
    const repository = new InMemoryBookingRepository();
    const service = createService(repository);
    const scheduledPickupAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ).toISOString();

    const ride = await service.createRide({
      ...baseRequest,
      categoryCode: "scheduled_ride",
      scheduledPickupAt,
    });

    expect(ride.state).toBe("requested");
    expect(ride.categoryCode).toBe("scheduled_ride");
    expect(ride.scheduledPickupAt).toBe(scheduledPickupAt);
  });

  it("rejects unsupported payment methods before pricing the ride", async () => {
    const service = createService(new InMemoryBookingRepository());

    await expect(
      service.createRide({...baseRequest, paymentMethod: "card"} as never),
    ).rejects.toThrow("Payment method is invalid");
  });

  it("rejects missing or malformed idempotency keys", async () => {
    const service = createService(new InMemoryBookingRepository());

    await expect(
      service.createRide({...baseRequest, idempotencyKey: "short"}),
    ).rejects.toThrow("Idempotency key is invalid");
  });

  it("rejects malformed scheduled pickup times", async () => {
    const service = createService(new InMemoryBookingRepository());

    await expect(
      service.createRide({
        ...baseRequest,
        categoryCode: "scheduled_ride",
        scheduledPickupAt: "tomorrow",
      }),
    ).rejects.toThrow("Scheduled pickup time is invalid");
  });

  it("requires scheduled_ride exactly when a pickup time is supplied", async () => {
    const service = createService(new InMemoryBookingRepository());
    const scheduledPickupAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await expect(
      service.createRide({...baseRequest, scheduledPickupAt}),
    ).rejects.toThrow("Scheduled pickup time requires scheduled_ride category");
    await expect(
      service.createRide({...baseRequest, categoryCode: "scheduled_ride"}),
    ).rejects.toThrow("Scheduled rides require a pickup time");
  });

  it("rejects scheduled pickups beyond Flutter's 90-day limit", async () => {
    const service = createService(new InMemoryBookingRepository());
    const scheduledPickupAt = new Date(
      Date.now() + 91 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await expect(
      service.createRide({
        ...baseRequest,
        categoryCode: "scheduled_ride",
        scheduledPickupAt,
      }),
    ).rejects.toThrow("Scheduled pickup time must be within 90 days");
  });

  it("rejects scheduled pickup times in the past", async () => {
    const service = createService(new InMemoryBookingRepository());

    await expect(
      service.createRide({
        ...baseRequest,
        categoryCode: "scheduled_ride",
        scheduledPickupAt: "2020-01-01T00:00:00.000Z",
      }),
    ).rejects.toThrow("Scheduled pickup time must be in the future");
  });

  it("cancels a rider's requested ride and records the transition", async () => {
    const repository = new InMemoryBookingRepository();
    const service = createService(repository);
    const ride = await service.createRide(baseRequest);

    const cancelled = await service.cancelRide({
      rideId: ride.id,
      riderId: "rider_123",
    });

    expect(cancelled?.state).toBe("cancelled_by_rider");
    expect(repository.transitions).toContainEqual(
      expect.objectContaining({
        rideId: ride.id,
        fromState: "requested",
        toState: "cancelled_by_rider",
        actorType: "rider",
      }),
    );
  });
});
