import {
  DriverEarnings,
  DriverPresence,
  DriverRideStateChange,
  DriverRideView,
} from "./driver-ride.types";

export abstract class DriverRideRepository {
  abstract updateAvailability(input: {
    driverId: string;
    online: boolean;
    latitude: number | null;
    longitude: number | null;
    occurredAt: string;
  }): Promise<DriverPresence>;

  abstract findActiveRideForDriver(
    driverId: string,
  ): Promise<DriverRideView | null>;

  abstract findRideForDriver(
    rideId: string,
    driverId: string,
  ): Promise<DriverRideView | null>;

  /**
   * Atomically claims the oldest unassigned requested/matching ride in the
   * driver's city and offers it to the driver. Returns null when the driver is
   * offline, another driver claimed the ride first, or no ride is waiting.
   */
  abstract claimNextRideForDriver(input: {
    driverId: string;
    cityId: string;
    occurredAt: string;
  }): Promise<DriverRideView | null>;

  abstract changeRideStateForDriver(
    change: DriverRideStateChange,
  ): Promise<DriverRideView | null>;

  /**
   * Declines an offered ride: audits offered_to_driver -> driver_timeout ->
   * matching and returns the ride to the unassigned pool.
   */
  abstract declineOfferForDriver(input: {
    rideId: string;
    driverId: string;
    occurredAt: string;
  }): Promise<DriverRideView | null>;

  abstract updateLocation(input: {
    driverId: string;
    latitude: number;
    longitude: number;
    occurredAt: string;
  }): Promise<DriverPresence>;

  abstract listFinishedRidesForDriver(
    driverId: string,
    limit: number,
  ): Promise<DriverRideView[]>;

  abstract earningsForDriver(input: {
    driverId: string;
    todayStart: string;
    weekStart: string;
  }): Promise<DriverEarnings>;
}
