import type { Coordinates } from "./geo";
import type { RideState, RideTransitionActorType } from "./ride-states";

const transitions: Record<RideState, readonly RideState[]> = {
  requested: ["matching", "cancelled_by_rider", "cancelled_by_admin"],
  matching: ["offered_to_driver", "driver_timeout", "cancelled_by_rider", "cancelled_by_admin"],
  offered_to_driver: ["accepted", "driver_timeout", "cancelled_by_rider", "cancelled_by_admin"],
  accepted: [
    "driver_en_route_to_pickup",
    "cancelled_by_rider",
    "cancelled_by_driver",
    "cancelled_by_admin",
    "incident_reported",
  ],
  driver_en_route_to_pickup: [
    "arrived_at_pickup",
    "cancelled_by_rider",
    "cancelled_by_driver",
    "cancelled_by_admin",
    "incident_reported",
  ],
  arrived_at_pickup: [
    "rider_onboarded",
    "no_show",
    "cancelled_by_rider",
    "cancelled_by_driver",
    "cancelled_by_admin",
    "incident_reported",
  ],
  rider_onboarded: ["in_progress", "cancelled_by_admin", "incident_reported"],
  in_progress: [
    "arrived_at_destination",
    "cancelled_by_admin",
    "incident_reported",
    "disputed",
  ],
  arrived_at_destination: ["payment_pending", "disputed", "incident_reported"],
  payment_pending: ["completed", "payment_failed", "disputed"],
  completed: ["disputed"],
  cancelled_by_rider: ["disputed"],
  cancelled_by_driver: ["disputed"],
  cancelled_by_admin: ["disputed"],
  no_show: ["disputed"],
  driver_timeout: ["matching", "cancelled_by_admin"],
  payment_failed: ["payment_pending", "disputed"],
  disputed: [],
  incident_reported: ["disputed", "cancelled_by_admin"],
};

export type RideStateTransitionInput = {
  rideId: string;
  from: RideState;
  to: RideState;
  actorType: RideTransitionActorType;
  actorId: string;
  occurredAt: string;
  location?: Coordinates;
  reason?: string;
  source?: "rider_app" | "driver_app" | "admin" | "system";
};

export function canTransitionRideState(from: RideState, to: RideState): boolean {
  return transitions[from].includes(to);
}

export function assertRideStateTransition(
  input: RideStateTransitionInput,
): RideStateTransitionInput {
  if (!canTransitionRideState(input.from, input.to)) {
    throw new Error(`Invalid ride state transition: ${input.from} -> ${input.to}`);
  }

  return input;
}
