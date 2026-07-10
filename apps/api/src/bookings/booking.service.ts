import { Injectable } from "@nestjs/common";
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
}
