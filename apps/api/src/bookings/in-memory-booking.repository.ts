import { BookingRepository } from "./booking.repository";
import {
  BookingRide,
  BookingRideTransition,
  CreateRideRequest,
} from "./booking.types";

export class InMemoryBookingRepository extends BookingRepository {
  readonly rides: BookingRide[] = [];
  readonly transitions: BookingRideTransition[] = [];

  async createRide(
    request: CreateRideRequest,
    requestedAt: string,
  ): Promise<BookingRide> {
    const ride: BookingRide = {
      id: `ride_${this.rides.length + 1}`,
      cityId: request.cityId,
      riderId: request.riderId,
      categoryCode: request.categoryCode,
      state: "requested",
      pickup: request.pickup,
      destination: request.destination,
      scheduledPickupAt: request.scheduledPickupAt ?? null,
      requestedAt,
    };

    this.rides.push(ride);
    return ride;
  }

  async recordTransition(
    transition: Omit<BookingRideTransition, "id">,
  ): Promise<BookingRideTransition> {
    const recordedTransition = {
      ...transition,
      id: `transition_${this.transitions.length + 1}`,
    };

    this.transitions.push(recordedTransition);
    return recordedTransition;
  }
}
