import { RideState } from "@tami/shared";
import { DriverRideRepository } from "./driver-ride.repository";
import {
  driverActiveRideStates,
  driverFinishedRideStates,
  DriverEarnings,
  DriverPresence,
  DriverRideStateChange,
  DriverRideView,
} from "./driver-ride.types";

export type InMemoryTransition = {
  rideId: string;
  fromState: RideState | null;
  toState: RideState;
  actorType: string;
  actorId: string;
  source: string;
  occurredAt: string;
};

export class InMemoryDriverRideRepository extends DriverRideRepository {
  readonly rides: DriverRideView[] = [];
  readonly presences = new Map<string, DriverPresence>();
  readonly transitions: InMemoryTransition[] = [];

  async updateAvailability(input: {
    driverId: string;
    online: boolean;
    latitude: number | null;
    longitude: number | null;
    occurredAt: string;
  }): Promise<DriverPresence> {
    const presence: DriverPresence = {
      driverId: input.driverId,
      online: input.online,
      latitude: input.latitude,
      longitude: input.longitude,
      lastOnlineAt: input.online ? input.occurredAt : null,
    };
    this.presences.set(input.driverId, presence);
    return presence;
  }

  async findActiveRideForDriver(
    driverId: string,
  ): Promise<DriverRideView | null> {
    return (
      this.rides.find(
        (ride) =>
          ride.driverId === driverId &&
          driverActiveRideStates.includes(ride.state),
      ) ?? null
    );
  }

  async findRideForDriver(
    rideId: string,
    driverId: string,
  ): Promise<DriverRideView | null> {
    return (
      this.rides.find(
        (ride) => ride.id === rideId && ride.driverId === driverId,
      ) ?? null
    );
  }

  async claimNextRideForDriver(input: {
    driverId: string;
    cityId: string;
    occurredAt: string;
  }): Promise<DriverRideView | null> {
    const presence = this.presences.get(input.driverId);
    if (presence == null || !presence.online) {
      return null;
    }
    const candidate = this.rides
      .filter(
        (ride) =>
          ride.cityId === input.cityId &&
          ride.driverId === null &&
          (ride.state === "requested" || ride.state === "matching") &&
          (ride.scheduledPickupAt == null ||
            ride.scheduledPickupAt <= input.occurredAt),
      )
      .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt))[0];
    if (candidate == null) {
      return null;
    }
    if (candidate.state === "requested") {
      this.transitions.push({
        rideId: candidate.id,
        fromState: "requested",
        toState: "matching",
        actorType: "system",
        actorId: "dispatch",
        source: "system",
        occurredAt: input.occurredAt,
      });
      candidate.state = "matching";
    }
    this.transitions.push({
      rideId: candidate.id,
      fromState: "matching",
      toState: "offered_to_driver",
      actorType: "system",
      actorId: "dispatch",
      source: "system",
      occurredAt: input.occurredAt,
    });
    candidate.state = "offered_to_driver";
    candidate.driverId = input.driverId;
    return candidate;
  }

  async changeRideStateForDriver(
    change: DriverRideStateChange,
  ): Promise<DriverRideView | null> {
    const ride = this.rides.find(
      (candidate) =>
        candidate.id === change.rideId &&
        candidate.driverId === change.driverId &&
        candidate.state === change.fromState,
    );
    if (ride == null) {
      return null;
    }
    ride.state = change.toState;
    if (change.finalFareMinor != null) {
      ride.finalFareMinor = change.finalFareMinor;
    }
    this.transitions.push({
      rideId: change.rideId,
      fromState: change.fromState,
      toState: change.toState,
      actorType: change.actorType,
      actorId: change.actorId,
      source: change.source,
      occurredAt: change.occurredAt,
    });
    return ride;
  }

  async declineOfferForDriver(input: {
    rideId: string;
    driverId: string;
    occurredAt: string;
  }): Promise<DriverRideView | null> {
    const ride = this.rides.find(
      (candidate) =>
        candidate.id === input.rideId &&
        candidate.driverId === input.driverId &&
        candidate.state === "offered_to_driver",
    );
    if (ride == null) {
      return null;
    }
    this.transitions.push({
      rideId: ride.id,
      fromState: "offered_to_driver",
      toState: "driver_timeout",
      actorType: "driver",
      actorId: input.driverId,
      source: "driver_app",
      occurredAt: input.occurredAt,
    });
    this.transitions.push({
      rideId: ride.id,
      fromState: "driver_timeout",
      toState: "matching",
      actorType: "system",
      actorId: "dispatch",
      source: "system",
      occurredAt: input.occurredAt,
    });
    ride.state = "matching";
    ride.driverId = null;
    return ride;
  }

  async updateLocation(input: {
    driverId: string;
    latitude: number;
    longitude: number;
    occurredAt: string;
  }): Promise<DriverPresence> {
    const existing = this.presences.get(input.driverId);
    const presence: DriverPresence = {
      driverId: input.driverId,
      online: existing?.online ?? false,
      latitude: input.latitude,
      longitude: input.longitude,
      lastOnlineAt: existing?.lastOnlineAt ?? null,
    };
    this.presences.set(input.driverId, presence);
    return presence;
  }

  async listFinishedRidesForDriver(
    driverId: string,
    limit: number,
  ): Promise<DriverRideView[]> {
    return this.rides
      .filter(
        (ride) =>
          ride.driverId === driverId &&
          driverFinishedRideStates.includes(ride.state),
      )
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))
      .slice(0, limit);
  }

  async earningsForDriver(input: {
    driverId: string;
    todayStart: string;
    weekStart: string;
  }): Promise<DriverEarnings> {
    const completions = this.transitions.filter(
      (transition) =>
        transition.toState === "completed" &&
        this.rides.some(
          (ride) =>
            ride.id === transition.rideId && ride.driverId === input.driverId,
        ),
    );
    const window = (start: string) => {
      const inWindow = completions.filter(
        (transition) => transition.occurredAt >= start,
      );
      const totalMinor = inWindow.reduce((sum, transition) => {
        const ride = this.rides.find(
          (candidate) => candidate.id === transition.rideId,
        );
        return sum + (ride?.finalFareMinor ?? 0);
      }, 0);
      return {rides: inWindow.length, totalMinor};
    };
    return {
      currency: "PKR",
      today: window(input.todayStart),
      week: window(input.weekStart),
    };
  }
}
