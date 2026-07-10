import {
  BookingRide,
  BookingRideTransition,
  CreateRideRequest,
} from "./booking.types";

export abstract class BookingRepository {
  abstract createRideWithInitialTransition(
    request: CreateRideRequest,
    requestedAt: string,
  ): Promise<BookingRide>;

  abstract recordTransition(
    transition: Omit<BookingRideTransition, "id">,
  ): Promise<BookingRideTransition>;
}
