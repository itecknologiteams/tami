import { BookingRepository } from "./booking.repository";
import {
  BookingRide,
  BookingRidePage,
  BookingPayment,
  BookingRideTransition,
  CreateRideForRiderRequest,
  PersistRideForRiderRequest,
  RiderRideStateChange,
  terminalRideStates,
} from "./booking.types";

type InMemoryRideRequest = Omit<
  CreateRideForRiderRequest,
  "paymentMethod" | "idempotencyKey"
> &
  Partial<
    Pick<
      PersistRideForRiderRequest,
      | "idempotencyKey"
      | "paymentMethod"
      | "estimatedFareMinor"
      | "currency"
      | "farePolicyId"
      | "farePolicyVersion"
      | "fareMultiplier"
      | "routeDistanceMeters"
      | "routeDurationSeconds"
    >
  >;

export class InMemoryBookingRepository extends BookingRepository {
  readonly rides: BookingRide[] = [];
  readonly transitions: BookingRideTransition[] = [];
  readonly payments: BookingPayment[] = [];
  private readonly idempotentRides = new Map<string, BookingRide>();

  async findRideByIdempotencyKey(
    riderId: string,
    idempotencyKey: string,
  ): Promise<BookingRide | null> {
    return this.idempotentRides.get(`${riderId}:${idempotencyKey}`) ?? null;
  }

  async createRideWithInitialTransition(
    request: InMemoryRideRequest,
    requestedAt: string,
  ): Promise<BookingRide> {
    const ride: BookingRide = {
      id: `ride_${this.rides.length + 1}`,
      cityId: request.cityId,
      riderId: request.riderId,
      driverId: null,
      categoryCode: request.categoryCode,
      state: "requested",
      pickup: request.pickup,
      destination: request.destination,
      scheduledPickupAt: request.scheduledPickupAt ?? null,
      requestedAt,
      estimatedFareMinor: request.estimatedFareMinor ?? 0,
      currency: request.currency ?? "PKR",
      farePolicyVersion: request.farePolicyVersion ?? null,
      paymentMethod: request.paymentMethod ?? "cash",
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
    this.payments.push({
      rideId: ride.id,
      method: request.paymentMethod ?? "cash",
      status: "pending",
      amountMinor: request.estimatedFareMinor ?? 0,
      currency: request.currency ?? "PKR",
    });
    this.idempotentRides.set(
      `${request.riderId}:${request.idempotencyKey ?? ride.id}`,
      ride,
    );

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

  async findCurrentRideForRider(
    riderId: string,
    now: Date,
  ): Promise<BookingRide | null> {
    return (
      this.rides
        .filter(
          (ride) =>
            ride.riderId === riderId &&
            !terminalRideStates.includes(ride.state) &&
            (ride.scheduledPickupAt == null ||
              new Date(ride.scheduledPickupAt) <= now),
        )
        .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))[0] ??
      null
    );
  }

  async findUpcomingRidesForRider(
    riderId: string,
    now: Date,
  ): Promise<BookingRide[]> {
    return this.rides
      .filter(
        (ride) =>
          ride.riderId === riderId &&
          !terminalRideStates.includes(ride.state) &&
          ride.scheduledPickupAt != null &&
          new Date(ride.scheduledPickupAt) > now,
      )
      .sort((left, right) =>
        left.scheduledPickupAt!.localeCompare(right.scheduledPickupAt!),
      );
  }

  async findRideHistoryForRider(
    riderId: string,
    options: { cursor?: string; limit: number },
  ): Promise<BookingRidePage> {
    const rides = this.rides
      .filter(
        (ride) =>
          ride.riderId === riderId && terminalRideStates.includes(ride.state),
      )
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
    const cursorIndex = options.cursor
      ? rides.findIndex((ride) => ride.id === options.cursor)
      : -1;
    const start = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    const page = rides.slice(start, start + options.limit + 1);
    const hasMore = page.length > options.limit;
    const items = page.slice(0, options.limit);
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    };
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
