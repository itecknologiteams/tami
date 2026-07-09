import { describe, expect, it } from "vitest";
import { BookingService } from "./booking.service";
import { InMemoryBookingRepository } from "./in-memory-booking.repository";

const baseRequest = {
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
    longitude: 67.0500,
    address: "Mazar-e-Quaid, Karachi",
  },
};

describe("BookingService", () => {
  it("creates an immediate ride in requested state with an audit transition", async () => {
    const repository = new InMemoryBookingRepository();
    const service = new BookingService(repository);

    const ride = await service.createRide(baseRequest);

    expect(ride.state).toBe("requested");
    expect(ride.cityId).toBe("city_karachi");
    expect(ride.scheduledPickupAt).toBeNull();
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

  it("creates a scheduled ride with a scheduled pickup time", async () => {
    const repository = new InMemoryBookingRepository();
    const service = new BookingService(repository);
    const scheduledPickupAt = "2026-08-01T08:30:00.000Z";

    const ride = await service.createRide({
      ...baseRequest,
      categoryCode: "scheduled_ride",
      scheduledPickupAt,
    });

    expect(ride.state).toBe("requested");
    expect(ride.categoryCode).toBe("scheduled_ride");
    expect(ride.scheduledPickupAt).toBe(scheduledPickupAt);
  });
});
