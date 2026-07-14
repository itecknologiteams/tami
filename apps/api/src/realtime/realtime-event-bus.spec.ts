import { describe, expect, it, vi } from "vitest";
import { RealtimeEventBus } from "./realtime-event-bus";

describe("RealtimeEventBus", () => {
  it("delivers a published event to its subscriber", () => {
    const bus = new RealtimeEventBus();
    const handler = vi.fn();
    bus.subscribe("ride.offer", handler);

    bus.publish("ride.offer", {rideId: "ride_1", driverId: "driver_1"});

    expect(handler).toHaveBeenCalledWith({rideId: "ride_1", driverId: "driver_1"});
  });

  it("delivers a published event to multiple subscribers", () => {
    const bus = new RealtimeEventBus();
    const first = vi.fn();
    const second = vi.fn();
    bus.subscribe("ride.offer", first);
    bus.subscribe("ride.offer", second);

    bus.publish("ride.offer", {rideId: "ride_1", driverId: "driver_1"});

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("does not deliver events across unrelated event names", () => {
    const bus = new RealtimeEventBus();
    const offerHandler = vi.fn();
    const chatHandler = vi.fn();
    bus.subscribe("ride.offer", offerHandler);
    bus.subscribe("chat.message", chatHandler);

    bus.publish("ride.offer", {rideId: "ride_1", driverId: "driver_1"});

    expect(offerHandler).toHaveBeenCalledTimes(1);
    expect(chatHandler).not.toHaveBeenCalled();
  });

  it("invokes subscribers in subscription order for repeated publishes", () => {
    const bus = new RealtimeEventBus();
    const calls: string[] = [];
    bus.subscribe("ride.offer", () => calls.push("first"));
    bus.subscribe("ride.offer", () => calls.push("second"));

    bus.publish("ride.offer", {rideId: "ride_1", driverId: "driver_1"});
    bus.publish("ride.offer", {rideId: "ride_2", driverId: "driver_1"});

    expect(calls).toEqual(["first", "second", "first", "second"]);
  });
});
