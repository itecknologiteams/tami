import { RideState } from "@tami/shared";

export const rideCategoryCodes = [
  "standard_taxi",
  "women_family_preferred",
  "airport",
  "accessible_special_assistance",
  "government_staff_movement",
  "scheduled_ride",
] as const;

export type RideCategoryCode = (typeof rideCategoryCodes)[number];

export type RiderPaymentMethod = "cash" | "jazzcash" | "easypaisa" | "nayapay";

export type Coordinates = {
  latitude: number;
  longitude: number;
  address: string;
};

export type CreateRideRequest = {
  categoryCode: RideCategoryCode;
  pickup: Coordinates;
  destination: Coordinates;
  paymentMethod: RiderPaymentMethod;
  scheduledPickupAt?: string;
};

export type PersistRideForRiderRequest = CreateRideForRiderRequest & {
  estimatedFareMinor: number;
  currency: string;
  farePolicyId: string;
  farePolicyVersion: number;
  fareMultiplier: number;
  routeDistanceMeters: number;
  routeDurationSeconds: number;
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
  estimatedFareMinor: number | null;
  currency: string;
  farePolicyVersion: number | null;
  paymentMethod: RiderPaymentMethod | null;
};

export type BookingPayment = {
  rideId: string;
  method: RiderPaymentMethod;
  status: "pending";
  amountMinor: number;
  currency: string;
};

export type BookingRidePage = {
  items: BookingRide[];
  nextCursor: string | null;
};

export const terminalRideStates: readonly RideState[] = [
  "completed",
  "cancelled_by_rider",
  "cancelled_by_driver",
  "cancelled_by_admin",
  "no_show",
  "disputed",
];

export type BookingRideTransition = {
  id: string;
  rideId: string;
  fromState: RideState | null;
  toState: RideState;
  actorType: "rider" | "driver" | "admin" | "system";
  actorId: string;
  occurredAt: string;
};

export type RiderRideStateChange = {
  rideId: string;
  riderId: string;
  fromState: RideState;
  toState: RideState;
  occurredAt: string;
};
