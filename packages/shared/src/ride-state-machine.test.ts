import { describe, expect, it } from "vitest";
import {
  assertRideStateTransition,
  canTransitionRideState,
} from "./ride-state-machine";

describe("ride state machine", () => {
  it("allows the normal ride lifecycle", () => {
    expect(canTransitionRideState("requested", "matching")).toBe(true);
    expect(canTransitionRideState("matching", "offered_to_driver")).toBe(true);
    expect(canTransitionRideState("offered_to_driver", "accepted")).toBe(true);
    expect(canTransitionRideState("accepted", "driver_en_route_to_pickup")).toBe(true);
    expect(canTransitionRideState("driver_en_route_to_pickup", "arrived_at_pickup")).toBe(true);
    expect(canTransitionRideState("arrived_at_pickup", "rider_onboarded")).toBe(true);
    expect(canTransitionRideState("rider_onboarded", "in_progress")).toBe(true);
    expect(canTransitionRideState("in_progress", "arrived_at_destination")).toBe(true);
    expect(canTransitionRideState("arrived_at_destination", "payment_pending")).toBe(true);
    expect(canTransitionRideState("payment_pending", "completed")).toBe(true);
  });

  it("blocks invalid backward transitions", () => {
    expect(canTransitionRideState("completed", "in_progress")).toBe(false);
    expect(() =>
      assertRideStateTransition({
        rideId: "ride_123",
        from: "completed",
        to: "in_progress",
        actorType: "driver",
        actorId: "driver_123",
        occurredAt: "2026-07-09T12:00:00.000Z",
      }),
    ).toThrow("Invalid ride state transition: completed -> in_progress");
  });

  it("allows cancellation from active pre-completion states", () => {
    expect(canTransitionRideState("requested", "cancelled_by_rider")).toBe(true);
    expect(canTransitionRideState("accepted", "cancelled_by_driver")).toBe(true);
    expect(canTransitionRideState("in_progress", "cancelled_by_admin")).toBe(true);
  });
});
