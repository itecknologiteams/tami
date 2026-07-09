import { Injectable } from "@nestjs/common";
import { BookingRepository } from "./booking.repository";
import { BookingRide, CreateRideRequest } from "./booking.types";

@Injectable()
export class BookingService {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async createRide(request: CreateRideRequest): Promise<BookingRide> {
    const requestedAt = new Date().toISOString();
    const ride = await this.bookingRepository.createRide(request, requestedAt);

    await this.bookingRepository.recordTransition({
      rideId: ride.id,
      fromState: null,
      toState: "requested",
      actorType: "rider",
      actorId: request.riderId,
      occurredAt: requestedAt,
    });

    return ride;
  }
}
