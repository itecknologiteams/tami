import {
  BookingRide,
  BookingRideTransition,
  CreateRideForRiderRequest,
  RiderRideStateChange,
} from "./booking.types";

export abstract class BookingRepository {
  abstract createRideWithInitialTransition(
    request: CreateRideForRiderRequest,
    requestedAt: string,
  ): Promise<BookingRide>;

  abstract recordTransition(
    transition: Omit<BookingRideTransition, "id">,
  ): Promise<BookingRideTransition>;

  abstract findRideForRider(
    rideId: string,
    riderId: string,
  ): Promise<BookingRide | null>;

  abstract changeRideStateForRider(
    change: RiderRideStateChange,
  ): Promise<BookingRide | null>;
}
