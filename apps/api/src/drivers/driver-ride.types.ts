import { RideState } from "@tami/shared";
import {
  Coordinates,
  RideCategoryCode,
} from "../bookings/booking.types";

export type DriverRideView = {
  id: string;
  state: RideState;
  cityId: string;
  riderId: string;
  riderPhone: string | null;
  driverId: string | null;
  categoryCode: RideCategoryCode;
  pickup: Coordinates;
  destination: Coordinates;
  estimatedFareMinor: number | null;
  finalFareMinor: number | null;
  currency: string;
  requestedAt: string;
  scheduledPickupAt: string | null;
};

export type DriverPresence = {
  driverId: string;
  online: boolean;
  latitude: number | null;
  longitude: number | null;
  lastOnlineAt: string | null;
};

export type DriverRideStateChange = {
  rideId: string;
  driverId: string;
  fromState: RideState;
  toState: RideState;
  actorType: "driver" | "system";
  actorId: string;
  source: "driver_app" | "system";
  occurredAt: string;
  finalFareMinor?: number;
};

export const driverActiveRideStates: readonly RideState[] = [
  "offered_to_driver",
  "accepted",
  "driver_en_route_to_pickup",
  "arrived_at_pickup",
  "rider_onboarded",
  "in_progress",
  "arrived_at_destination",
  "payment_pending",
];

export const driverAdvanceStates: readonly RideState[] = [
  "driver_en_route_to_pickup",
  "arrived_at_pickup",
  "rider_onboarded",
  "in_progress",
  "arrived_at_destination",
];

export const driverFinishedRideStates: readonly RideState[] = [
  "completed",
  "cancelled_by_rider",
  "cancelled_by_driver",
  "cancelled_by_admin",
  "no_show",
];

export type DriverEarningsWindow = {
  rides: number;
  totalMinor: number;
};

export type DriverEarnings = {
  currency: string;
  today: DriverEarningsWindow;
  week: DriverEarningsWindow;
};
