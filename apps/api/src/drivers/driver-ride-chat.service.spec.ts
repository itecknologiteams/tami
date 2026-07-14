import { describe, expect, it, vi } from "vitest";
import { RideChatRepository } from "../chat/ride-chat.repository";
import type { RideChatMessage } from "../chat/ride-chat.types";
import { RealtimeEventBus } from "../realtime/realtime-event-bus";
import { DriverRideChatService } from "./driver-ride-chat.service";
import { InMemoryDriverRideRepository } from "./in-memory-driver-ride.repository";
import { DriverRideView } from "./driver-ride.types";

function createFakeEventBus() {
  return {publish: vi.fn(), subscribe: vi.fn()} as unknown as RealtimeEventBus & {
    publish: ReturnType<typeof vi.fn>;
  };
}

function acceptedRide(overrides: Partial<DriverRideView> = {}): DriverRideView {
  return {
    id: "ride_1",
    state: "accepted",
    cityId: "city_karachi",
    riderId: "rider_123",
    riderPhone: "+923001234567",
    driverId: "driver_1",
    categoryCode: "standard_taxi",
    pickup: {latitude: 24.8607, longitude: 67.0011, address: "Frere Hall"},
    destination: {latitude: 24.8753, longitude: 67.0407, address: "Mazar-e-Quaid"},
    estimatedFareMinor: 35000,
    finalFareMinor: null,
    currency: "PKR",
    requestedAt: "2026-07-14T10:00:00.000Z",
    scheduledPickupAt: null,
    ...overrides,
  };
}

describe("DriverRideChatService", () => {
  it("allows the driver to send a message once the ride is accepted and publishes chat.message", async () => {
    const rideRepository = new InMemoryDriverRideRepository();
    rideRepository.rides.push(acceptedRide());
    const chatRepository = new InMemoryRideChatRepository();
    const eventBus = createFakeEventBus();
    const service = new DriverRideChatService(rideRepository, chatRepository, eventBus);

    const message = await service.sendDriverMessage({
      rideId: "ride_1",
      driverId: "driver_1",
      body: "On my way.",
    });

    expect(message).toEqual(
      expect.objectContaining({
        rideId: "ride_1",
        senderType: "driver",
        senderId: "driver_1",
        body: "On my way.",
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      "chat.message",
      expect.objectContaining({
        rideId: "ride_1",
        riderId: "rider_123",
        driverId: "driver_1",
        senderType: "driver",
        senderId: "driver_1",
        body: "On my way.",
      }),
    );
  });

  it("rejects chat before the ride is accepted and does not publish", async () => {
    const rideRepository = new InMemoryDriverRideRepository();
    rideRepository.rides.push(acceptedRide({state: "offered_to_driver"}));
    const eventBus = createFakeEventBus();
    const service = new DriverRideChatService(
      rideRepository,
      new InMemoryRideChatRepository(),
      eventBus,
    );

    await expect(
      service.sendDriverMessage({
        rideId: "ride_1",
        driverId: "driver_1",
        body: "On my way.",
      }),
    ).rejects.toThrow("Chat is available after the driver accepts the ride");
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it("rejects a ride that does not belong to the driver", async () => {
    const rideRepository = new InMemoryDriverRideRepository();
    rideRepository.rides.push(acceptedRide({driverId: "driver_2"}));
    const eventBus = createFakeEventBus();
    const service = new DriverRideChatService(
      rideRepository,
      new InMemoryRideChatRepository(),
      eventBus,
    );

    await expect(
      service.sendDriverMessage({
        rideId: "ride_1",
        driverId: "driver_1",
        body: "On my way.",
      }),
    ).rejects.toThrow("Ride not found");
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});

class InMemoryRideChatRepository extends RideChatRepository {
  private readonly messages: RideChatMessage[] = [];

  async listForRide(rideId: string): Promise<RideChatMessage[]> {
    return this.messages.filter((message) => message.rideId === rideId);
  }

  async createRiderMessage(input: {
    rideId: string;
    riderId: string;
    body: string;
    sentAt: string;
  }): Promise<RideChatMessage> {
    const message: RideChatMessage = {
      id: `message_${this.messages.length + 1}`,
      rideId: input.rideId,
      senderType: "rider",
      senderId: input.riderId,
      body: input.body,
      sentAt: input.sentAt,
    };
    this.messages.push(message);
    return message;
  }

  async createDriverMessage(input: {
    rideId: string;
    driverId: string;
    body: string;
    sentAt: string;
  }): Promise<RideChatMessage> {
    const message: RideChatMessage = {
      id: `message_${this.messages.length + 1}`,
      rideId: input.rideId,
      senderType: "driver",
      senderId: input.driverId,
      body: input.body,
      sentAt: input.sentAt,
    };
    this.messages.push(message);
    return message;
  }
}
