export const normalRideStates = [
  "requested",
  "matching",
  "offered_to_driver",
  "accepted",
  "driver_en_route_to_pickup",
  "arrived_at_pickup",
  "rider_onboarded",
  "in_progress",
  "arrived_at_destination",
  "payment_pending",
  "completed",
] as const;

export const exceptionRideStates = [
  "cancelled_by_rider",
  "cancelled_by_driver",
  "cancelled_by_admin",
  "no_show",
  "driver_timeout",
  "payment_failed",
  "disputed",
  "incident_reported",
] as const;

export type NormalRideState = (typeof normalRideStates)[number];
export type ExceptionRideState = (typeof exceptionRideStates)[number];
export type RideState = NormalRideState | ExceptionRideState;

export type RideTransitionActorType = "rider" | "driver" | "admin" | "system";
