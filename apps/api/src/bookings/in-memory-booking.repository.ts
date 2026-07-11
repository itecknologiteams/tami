import { BookingRepository } from "./booking.repository";
import {
  BookingRide,
  BookingRideTransition,
  CreateRideForRiderRequest,
  RiderRideStateChange,
} from "./booking.types";

export class InMemoryBookingRepository extends BookingRepository {
  readonly rides: BookingRide[] = [];
  readonly transitions: BookingRideTransition[] = [];

  async createRideWithInitialTransition(
    request: CreateRideForRiderRequest,
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
    this.transitions.push({
      id: `transition_${this.transitions.length + 1}`,
      rideId: ride.id,
      fromState: null,
      toState: "requested",
      actorType: "rider",
      actorId: request.riderId,
      occurredAt: requestedAt,
    });

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

  async findRideForRider(
    rideId: string,
    riderId: string,
  ): Promise<BookingRide | null> {
    return (
      this.rides.find((ride) => ride.id === rideId && ride.riderId === riderId) ??
      null
    );
  }

  async changeRideStateForRider(
    change: RiderRideStateChange,
  ): Promise<BookingRide | null> {
    const index = this.rides.findIndex(
      (ride) =>
        ride.id === change.rideId &&
        ride.riderId === change.riderId &&
        ride.state === change.fromState,
    );
    if (index === -1) {
      return null;
    }

    const existingRide = this.rides[index];
    if (existingRide == null) {
      return null;
    }
    const ride: BookingRide = {...existingRide, state: change.toState};
    this.rides[index] = ride;
    this.transitions.push({
      id: `transition_${this.transitions.length + 1}`,
      rideId: change.rideId,
      fromState: change.fromState,
      toState: change.toState,
      actorType: "rider",
      actorId: change.riderId,
      occurredAt: change.occurredAt,
    });
    return ride;
  }
}
