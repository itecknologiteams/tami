import { Injectable } from "@nestjs/common";
import { BookingRepository } from "./booking.repository";
import { BookingRide, CreateRideRequest } from "./booking.types";

@Injectable()
export class BookingService {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async createRide(request: CreateRideRequest): Promise<BookingRide> {
    const requestedAt = new Date().toISOString();
    return this.bookingRepository.createRideWithInitialTransition(
      request,
      requestedAt,
    );
  }
}
