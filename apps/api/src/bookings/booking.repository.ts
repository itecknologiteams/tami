import {
  BookingRide,
  BookingRideTransition,
  CreateRideForRiderRequest,
} from "./booking.types";

export abstract class BookingRepository {
  abstract createRideWithInitialTransition(
    request: CreateRideForRiderRequest,
    requestedAt: string,
  ): Promise<BookingRide>;

  abstract recordTransition(
    transition: Omit<BookingRideTransition, "id">,
  ): Promise<BookingRideTransition>;
}
