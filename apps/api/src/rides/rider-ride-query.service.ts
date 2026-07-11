import { Injectable } from "@nestjs/common";
import { BookingRepository } from "../bookings/booking.repository";
import { BookingRide, BookingRidePage } from "../bookings/booking.types";

@Injectable()
export class RiderRideQueryService {
  constructor(private readonly bookingRepository: BookingRepository) {}

  getCurrentRide(riderId: string, now = new Date()): Promise<BookingRide | null> {
    return this.bookingRepository.findCurrentRideForRider(riderId, now);
  }

  getUpcomingRides(riderId: string, now = new Date()): Promise<BookingRide[]> {
    return this.bookingRepository.findUpcomingRidesForRider(riderId, now);
  }

  getRideHistory(
    riderId: string,
    options: { cursor?: string; limit: number },
  ): Promise<BookingRidePage> {
    return this.bookingRepository.findRideHistoryForRider(riderId, options);
  }

  getRide(rideId: string, riderId: string): Promise<BookingRide | null> {
    return this.bookingRepository.findRideForRider(rideId, riderId);
  }
}
