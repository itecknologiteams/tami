import { describe, expect, it, vi } from "vitest";
import { InMemoryBookingRepository } from "../bookings/in-memory-booking.repository";
import { RealtimeEventBus } from "../realtime/realtime-event-bus";
import { RideChatController } from "./ride-chat.controller";
import { RideChatRepository } from "./ride-chat.repository";
import { RideChatService } from "./ride-chat.service";
import type { RideChatMessage } from "./ride-chat.types";

function createFakeEventBus(): RealtimeEventBus {
  return {publish: vi.fn(), subscribe: vi.fn()} as unknown as RealtimeEventBus;
}

const rider = {
  id: "rider_123",
  cityId: "city_karachi",
  phone: "+923001234567",
};

const createRequest = {
  cityId: rider.cityId,
  riderId: rider.id,
  categoryCode: "standard_taxi" as const,
  pickup: {latitude: 24.8607, longitude: 67.0011, address: "Frere Hall"},
  destination: {
    latitude: 24.8753,
    longitude: 67.0407,
    address: "Mazar-e-Quaid",
  },
};

describe("RideChatController", () => {
  it("sends and lists messages for the accepted rider-owned ride", async () => {
    const bookings = new InMemoryBookingRepository();
    const ride = await bookings.createRideWithInitialTransition(
      createRequest,
      "2026-07-11T10:00:00.000Z",
    );
    bookings.rides[0] = {...ride, state: "accepted"};
    const controller = new RideChatController(
      new RideChatService(bookings, new InMemoryRideChatRepository(), createFakeEventBus()),
    );

    await controller.sendMessage(rider, ride.id, {message: "I am at gate 2."});
    const messages = await controller.listMessages(rider, ride.id);

    expect(messages).toEqual([
      expect.objectContaining({
        senderType: "rider",
        senderId: rider.id,
        body: "I am at gate 2.",
      }),
    ]);
  });

  it("rejects chat before the ride is accepted", async () => {
    const bookings = new InMemoryBookingRepository();
    const ride = await bookings.createRideWithInitialTransition(
      createRequest,
      "2026-07-11T10:00:00.000Z",
    );
    const controller = new RideChatController(
      new RideChatService(bookings, new InMemoryRideChatRepository(), createFakeEventBus()),
    );

    await expect(
      controller.sendMessage(rider, ride.id, {message: "I am at gate 2."}),
    ).rejects.toThrow("Chat is available after the driver accepts the ride");
  });

  it("does not expose another rider's accepted chat", async () => {
    const bookings = new InMemoryBookingRepository();
    const ride = await bookings.createRideWithInitialTransition(
      createRequest,
      "2026-07-11T10:00:00.000Z",
    );
    bookings.rides[0] = {...ride, state: "accepted"};
    const controller = new RideChatController(
      new RideChatService(bookings, new InMemoryRideChatRepository(), createFakeEventBus()),
    );

    await expect(
      controller.listMessages({...rider, id: "rider_other"}, ride.id),
    ).rejects.toThrow("Ride not found");
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
