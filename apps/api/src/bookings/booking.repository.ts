import {
  BookingRide,
  BookingRidePage,
  BookingRideTransition,
  PersistRideForRiderRequest,
  RiderRideStateChange,
} from "./booking.types";

export abstract class BookingRepository {
  abstract createRideWithInitialTransition(
    request: PersistRideForRiderRequest,
    requestedAt: string,
  ): Promise<BookingRide>;

  abstract recordTransition(
    transition: Omit<BookingRideTransition, "id">,
  ): Promise<BookingRideTransition>;

  abstract findRideForRider(
    rideId: string,
    riderId: string,
  ): Promise<BookingRide | null>;

  abstract findCurrentRideForRider(
    riderId: string,
    now: Date,
  ): Promise<BookingRide | null>;

  abstract findUpcomingRidesForRider(
    riderId: string,
    now: Date,
  ): Promise<BookingRide[]>;

  abstract findRideHistoryForRider(
    riderId: string,
    options: { cursor?: string; limit: number },
  ): Promise<BookingRidePage>;

  abstract changeRideStateForRider(
    change: RiderRideStateChange,
  ): Promise<BookingRide | null>;
}
