import { RideState } from "@tami/shared";

export type RideCategoryCode =
  | "standard_taxi"
  | "women_family_preferred"
  | "airport"
  | "accessible_special_assistance"
  | "government_staff_movement"
  | "scheduled_ride";

export type Coordinates = {
  latitude: number;
  longitude: number;
  address: string;
};

export type CreateRideRequest = {
  categoryCode: RideCategoryCode;
  pickup: Coordinates;
  destination: Coordinates;
  scheduledPickupAt?: string;
};

export type CreateRideForRiderRequest = CreateRideRequest & {
  cityId: string;
  riderId: string;
};

export type BookingRide = {
  id: string;
  cityId: string;
  riderId: string;
  categoryCode: RideCategoryCode;
  state: RideState;
  pickup: Coordinates;
  destination: Coordinates;
  scheduledPickupAt: string | null;
  requestedAt: string;
};

export type BookingRideTransition = {
  id: string;
  rideId: string;
  fromState: RideState | null;
  toState: RideState;
  actorType: "rider" | "driver" | "admin" | "system";
  actorId: string;
  occurredAt: string;
};
