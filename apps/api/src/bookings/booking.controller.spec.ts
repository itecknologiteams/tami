import { describe, expect, it, vi } from "vitest";
import { BookingController } from "./booking.controller";
import { BookingService } from "./booking.service";
import { InMemoryBookingRepository } from "./in-memory-booking.repository";
import { createTestPricingService } from "../pricing/pricing.test-fixture";
import { RealtimeEventBus } from "../realtime/realtime-event-bus";

function createFakeEventBus(): RealtimeEventBus {
  return {publish: vi.fn(), subscribe: vi.fn()} as unknown as RealtimeEventBus;
}

describe("BookingController", () => {
  it("creates a ride request", async () => {
    const controller = new BookingController(
      new BookingService(
        new InMemoryBookingRepository(),
        createTestPricingService(),
        createFakeEventBus(),
      ),
    );

    const ride = await controller.createRide(
      {
        id: "rider_123",
        cityId: "city_karachi",
        phone: "+923001234567",
      },
      {
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
      },
      "controller_request_0001",
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

  it("cancels a ride for the authenticated rider", async () => {
    const controller = new BookingController(
      new BookingService(
        new InMemoryBookingRepository(),
        createTestPricingService(),
        createFakeEventBus(),
      ),
    );
    const rider = {
      id: "rider_123",
      cityId: "city_karachi",
      phone: "+923001234567",
    };
    const ride = await controller.createRide(
      rider,
      {
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
      },
      "controller_request_0002",
    );

    const cancelled = await controller.cancelRide(rider, ride.id);

    expect(cancelled.state).toBe("cancelled_by_rider");
  });

  it("does not allow a rider to cancel another rider's ride", async () => {
    const controller = new BookingController(
      new BookingService(
        new InMemoryBookingRepository(),
        createTestPricingService(),
        createFakeEventBus(),
      ),
    );
    const rider = {
      id: "rider_123",
      cityId: "city_karachi",
      phone: "+923001234567",
    };
    const ride = await controller.createRide(
      rider,
      {
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
      },
      "controller_request_0003",
    );

    await expect(
      controller.cancelRide({...rider, id: "rider_other"}, ride.id),
    ).rejects.toThrow("Ride not found or cannot be cancelled");
  });
});
