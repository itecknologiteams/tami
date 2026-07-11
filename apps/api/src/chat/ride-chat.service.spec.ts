import { describe, expect, it } from "vitest";
import { InMemoryBookingRepository } from "../bookings/in-memory-booking.repository";
import type { RideChatMessage } from "./ride-chat.types";
import { RideChatRepository } from "./ride-chat.repository";
import { RideChatService } from "./ride-chat.service";

const createRequest = {
  cityId: "city_karachi",
  riderId: "rider_123",
  categoryCode: "standard_taxi" as const,
  pickup: { latitude: 24.8607, longitude: 67.0011, address: "Frere Hall" },
  destination: { latitude: 24.8753, longitude: 67.0407, address: "Mazar-e-Quaid" },
};

describe("RideChatService", () => {
  it("allows the rider to send a message after ride acceptance", async () => {
    const bookings = new InMemoryBookingRepository();
    const ride = await bookings.createRideWithInitialTransition(
      createRequest,
      "2026-07-10T10:00:00.000Z",
    );
    bookings.rides[0] = {...ride, state: "accepted"};
    const messages = new InMemoryRideChatRepository();
    const service = new RideChatService(bookings, messages);

    const message = await service.sendRiderMessage({
      rideId: ride.id,
      riderId: "rider_123",
      body: "I am at the main gate.",
    });

    expect(message).toEqual(
      expect.objectContaining({
        rideId: ride.id,
        senderType: "rider",
        body: "I am at the main gate.",
      }),
    );
  });

  it("rejects chat before a ride is accepted", async () => {
    const bookings = new InMemoryBookingRepository();
    const ride = await bookings.createRideWithInitialTransition(
      createRequest,
      "2026-07-10T10:00:00.000Z",
    );
    const service = new RideChatService(bookings, new InMemoryRideChatRepository());

    await expect(
      service.sendRiderMessage({
        rideId: ride.id,
        riderId: "rider_123",
        body: "I am at the main gate.",
      }),
    ).rejects.toThrow("Chat is available after the driver accepts the ride");
  });
});

class InMemoryRideChatRepository extends RideChatRepository {
  private readonly messages: RideChatMessage[] = [];

  async listForRide(rideId: string): Promise<RideChatMessage[]> {
    return this.messages.filter((message) => message.rideId === rideId);
  }

  async createRiderMessage({
    rideId,
    riderId,
    body,
    sentAt,
  }: {
    rideId: string;
    riderId: string;
    body: string;
    sentAt: string;
  }): Promise<RideChatMessage> {
    const message = {
      id: `message_${this.messages.length + 1}`,
      rideId,
      senderType: "rider" as const,
      senderId: riderId,
      body,
      sentAt,
    };
    this.messages.push(message);
    return message;
  }
}
