import { Injectable } from "@nestjs/common";
import { assertRideStateTransition } from "@tami/shared";
import { BookingRepository } from "./booking.repository";
import { BookingRide, CreateRideForRiderRequest } from "./booking.types";

@Injectable()
export class BookingService {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async createRide(request: CreateRideForRiderRequest): Promise<BookingRide> {
    const requestedAt = new Date().toISOString();
    return this.bookingRepository.createRideWithInitialTransition(
      request,
      requestedAt,
    );
  }

  async cancelRide({
    rideId,
    riderId,
  }: {
    rideId: string;
    riderId: string;
  }): Promise<BookingRide | null> {
    const ride = await this.bookingRepository.findRideForRider(rideId, riderId);
    if (ride == null) {
      return null;
    }

    const occurredAt = new Date().toISOString();
    const transition = assertRideStateTransition({
      rideId,
      from: ride.state,
      to: "cancelled_by_rider",
      actorType: "rider",
      actorId: riderId,
      occurredAt,
      source: "rider_app",
    });
    return this.bookingRepository.changeRideStateForRider({
      rideId,
      riderId,
      fromState: transition.from,
      toState: transition.to,
      occurredAt,
    });
  }
}
