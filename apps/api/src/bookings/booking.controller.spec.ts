import { describe, expect, it } from "vitest";
import { BookingController } from "./booking.controller";
import { BookingService } from "./booking.service";
import { InMemoryBookingRepository } from "./in-memory-booking.repository";

describe("BookingController", () => {
  it("creates a ride request", async () => {
    const controller = new BookingController(
      new BookingService(new InMemoryBookingRepository()),
    );

    const ride = await controller.createRide(
      {
        id: "rider_123",
        cityId: "city_karachi",
        phone: "+923001234567",
      },
      {
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
      },
    );

    expect(ride).toEqual(
      expect.objectContaining({
        id: "ride_1",
        cityId: "city_karachi",
        riderId: "rider_123",
        categoryCode: "standard_taxi",
        state: "requested",
        scheduledPickupAt: null,
      }),
    );
  });
});
