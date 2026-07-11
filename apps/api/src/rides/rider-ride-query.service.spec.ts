import { describe, expect, it } from "vitest";
import { InMemoryBookingRepository } from "../bookings/in-memory-booking.repository";
import { RiderRideQueryService } from "./rider-ride-query.service";

const request = {
  cityId: "city_karachi",
  riderId: "rider_123",
  categoryCode: "standard_taxi" as const,
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

describe("RiderRideQueryService", () => {
  it("returns only the authenticated rider's current ride", async () => {
    const repository = new InMemoryBookingRepository();
    await repository.createRideWithInitialTransition(
      {...request, riderId: "rider_other"},
      "2026-07-11T08:00:00.000Z",
    );
    const current = await repository.createRideWithInitialTransition(
      request,
      "2026-07-11T09:00:00.000Z",
    );

    const service = new RiderRideQueryService(repository);

    await expect(service.getCurrentRide("rider_123")).resolves.toEqual(current);
  });

  it("separates future scheduled rides from terminal history", async () => {
    const repository = new InMemoryBookingRepository();
    const upcoming = await repository.createRideWithInitialTransition(
      {
        ...request,
        categoryCode: "scheduled_ride",
        scheduledPickupAt: "2026-07-12T10:00:00.000Z",
      },
      "2026-07-11T09:00:00.000Z",
    );
    const completed = await repository.createRideWithInitialTransition(
      request,
      "2026-07-10T09:00:00.000Z",
    );
    repository.rides[1] = {...completed, state: "completed"};

    const service = new RiderRideQueryService(repository);

    await expect(
      service.getUpcomingRides("rider_123", new Date("2026-07-11T12:00:00.000Z")),
    ).resolves.toEqual([upcoming]);
    await expect(service.getRideHistory("rider_123", {limit: 20})).resolves.toEqual({
      items: [{...completed, state: "completed"}],
      nextCursor: null,
    });
  });

  it("paginates history with a bounded cursor", async () => {
    const repository = new InMemoryBookingRepository();
    for (const requestedAt of [
      "2026-07-09T09:00:00.000Z",
      "2026-07-10T09:00:00.000Z",
      "2026-07-11T09:00:00.000Z",
    ]) {
      const ride = await repository.createRideWithInitialTransition(request, requestedAt);
      repository.rides[repository.rides.length - 1] = {...ride, state: "completed"};
    }
    const service = new RiderRideQueryService(repository);

    const first = await service.getRideHistory("rider_123", {limit: 2});
    const second = await service.getRideHistory("rider_123", {
      limit: 2,
      cursor: first.nextCursor!,
    });

    expect(first.items.map((ride) => ride.id)).toEqual(["ride_3", "ride_2"]);
    expect(first.nextCursor).toBe("ride_2");
    expect(second.items.map((ride) => ride.id)).toEqual(["ride_1"]);
    expect(second.nextCursor).toBeNull();
  });
});
