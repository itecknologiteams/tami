import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { BookingService } from "../bookings/booking.service";
import { InMemoryBookingRepository } from "../bookings/in-memory-booking.repository";
import { createTestPricingService } from "../pricing/pricing.test-fixture";
import { RealtimeEventBus } from "../realtime/realtime-event-bus";
import { RiderRideQueryController } from "./rider-ride-query.controller";
import { RiderRideQueryService } from "./rider-ride-query.service";

function createFakeEventBus(): RealtimeEventBus {
  return {publish: vi.fn(), subscribe: vi.fn()} as unknown as RealtimeEventBus;
}

const rider = {
  id: "rider_123",
  cityId: "city_karachi",
  phone: "+923001234567",
};

describe("RiderRideQueryController", () => {
  it("returns rider-owned detail and rejects another rider", async () => {
    const repository = new InMemoryBookingRepository();
    const booking = new BookingService(
      repository,
      createTestPricingService(),
      createFakeEventBus(),
    );
    const ride = await booking.createRide({
      cityId: rider.cityId,
      riderId: rider.id,
      idempotencyKey: "ride_query_request_0001",
      categoryCode: "standard_taxi",
      paymentMethod: "cash",
      pickup: {latitude: 24.86, longitude: 67.01, address: "Pickup"},
      destination: {latitude: 24.88, longitude: 67.05, address: "Destination"},
    });
    const controller = new RiderRideQueryController(
      new RiderRideQueryService(repository),
    );

    await expect(controller.getRide(rider, ride.id)).resolves.toEqual(ride);
    await expect(
      controller.getRide({...rider, id: "rider_other"}, ride.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("normalizes history limits", async () => {
    const repository = new InMemoryBookingRepository();
    const controller = new RiderRideQueryController(
      new RiderRideQueryService(repository),
    );

    await expect(controller.getHistory(rider, undefined, "500")).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
  });
});
