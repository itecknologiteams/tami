import { describe, expect, it } from "vitest";
import { RideTransitionService } from "./ride-transition.service";

describe("RideTransitionService", () => {
  it("records a valid transition", () => {
    const service = new RideTransitionService();

    const transition = service.recordTransition({
      rideId: "ride_123",
      from: "requested",
      to: "matching",
      actorType: "system",
      actorId: "system",
      occurredAt: "2026-07-09T12:00:00.000Z",
      source: "system",
    });

    expect(transition.to).toBe("matching");
  });

  it("rejects invalid transitions", () => {
    const service = new RideTransitionService();

    expect(() =>
      service.recordTransition({
        rideId: "ride_123",
        from: "completed",
        to: "accepted",
        actorType: "admin",
        actorId: "admin_123",
        occurredAt: "2026-07-09T12:00:00.000Z",
        source: "admin",
      }),
    ).toThrow("Invalid ride state transition: completed -> accepted");
  });
});
