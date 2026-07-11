import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { RideState } from "@tami/shared";
import { BookingRepository } from "../bookings/booking.repository";
import { RideChatRepository } from "./ride-chat.repository";
import type { RideChatMessage } from "./ride-chat.types";

const chatEligibleStates = new Set<RideState>([
  "accepted",
  "driver_en_route_to_pickup",
  "arrived_at_pickup",
  "rider_onboarded",
  "in_progress",
  "arrived_at_destination",
  "payment_pending",
]);

@Injectable()
export class RideChatService {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly chatRepository: RideChatRepository,
  ) {}

  async listRiderMessages({
    rideId,
    riderId,
  }: {
    rideId: string;
    riderId: string;
  }): Promise<RideChatMessage[]> {
    await this.assertRiderCanChat(rideId, riderId);
    return this.chatRepository.listForRide(rideId);
  }

  async sendRiderMessage({
    rideId,
    riderId,
    body,
  }: {
    rideId: string;
    riderId: string;
    body: string;
  }): Promise<RideChatMessage> {
    const trimmedBody = body.trim();
    if (trimmedBody.length === 0) {
      throw new BadRequestException("Message cannot be empty");
    }
    await this.assertRiderCanChat(rideId, riderId);
    return this.chatRepository.createRiderMessage({
      rideId,
      riderId,
      body: trimmedBody,
      sentAt: new Date().toISOString(),
    });
  }

  private async assertRiderCanChat(rideId: string, riderId: string) {
    const ride = await this.bookingRepository.findRideForRider(rideId, riderId);
    if (ride == null) {
      throw new NotFoundException("Ride not found");
    }
    if (!chatEligibleStates.has(ride.state)) {
      throw new BadRequestException(
        "Chat is available after the driver accepts the ride",
      );
    }
  }
}
