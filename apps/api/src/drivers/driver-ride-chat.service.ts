import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { RideState } from "@tami/shared";
import { RideChatRepository } from "../chat/ride-chat.repository";
import type { RideChatMessage } from "../chat/ride-chat.types";
import { DriverRideRepository } from "./driver-ride.repository";

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
export class DriverRideChatService {
  constructor(
    private readonly rideRepository: DriverRideRepository,
    private readonly chatRepository: RideChatRepository,
  ) {}

  async listDriverMessages({
    rideId,
    driverId,
  }: {
    rideId: string;
    driverId: string;
  }): Promise<RideChatMessage[]> {
    await this.assertDriverCanChat(rideId, driverId);
    return this.chatRepository.listForRide(rideId);
  }

  async sendDriverMessage({
    rideId,
    driverId,
    body,
  }: {
    rideId: string;
    driverId: string;
    body: string;
  }): Promise<RideChatMessage> {
    const trimmedBody = typeof body === "string" ? body.trim() : "";
    if (trimmedBody.length === 0) {
      throw new BadRequestException("Message cannot be empty");
    }
    await this.assertDriverCanChat(rideId, driverId);
    return this.chatRepository.createDriverMessage({
      rideId,
      driverId,
      body: trimmedBody,
      sentAt: new Date().toISOString(),
    });
  }

  private async assertDriverCanChat(rideId: string, driverId: string) {
    const ride = await this.rideRepository.findRideForDriver(rideId, driverId);
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
