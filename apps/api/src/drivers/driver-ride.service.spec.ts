import { describe, expect, it, vi } from "vitest";
import { AuthenticatedDriver } from "../auth/driver-auth.types";
import { RealtimeEventBus } from "../realtime/realtime-event-bus";
import { RoutingService } from "../routing/routing.service";
import { DriverRideService } from "./driver-ride.service";
import { InMemoryDriverRideRepository } from "./in-memory-driver-ride.repository";
import { DriverRideView } from "./driver-ride.types";

function createFakeEventBus() {
  return {publish: vi.fn(), subscribe: vi.fn()} as unknown as RealtimeEventBus & {
    publish: ReturnType<typeof vi.fn>;
  };
}

const stubRoute = {
  distanceMeters: 5200,
  durationSeconds: 840,
  coordinates: [
    {latitude: 24.86, longitude: 67.0},
    {latitude: 24.9, longitude: 67.07},
  ],
  method: "osrm_v1" as const,
};

function stubRoutingService(): RoutingService {
  return {
    previewDrivingRoute: vi.fn().mockResolvedValue(stubRoute),
  } as unknown as RoutingService;
}

const driver: AuthenticatedDriver = {
  id: "driver_1",
  phone: "+923009876543",
  cityId: "city_karachi",
};

function waitingRide(overrides: Partial<DriverRideView> = {}): DriverRideView {
  return {
    id: "ride_1",
    state: "requested",
    cityId: "city_karachi",
    riderId: "rider_1",
    riderPhone: "+923001234567",
    driverId: null,
    categoryCode: "standard_taxi",
    pickup: {latitude: 24.86, longitude: 67.0, address: "Saddar"},
    destination: {latitude: 24.9, longitude: 67.07, address: "Gulshan"},
    estimatedFareMinor: 35000,
    finalFareMinor: null,
    currency: "PKR",
    requestedAt: "2026-07-13T10:00:00.000Z",
    scheduledPickupAt: null,
    ...overrides,
  };
}

async function onlineService(rides: DriverRideView[] = [waitingRide()]) {
  const repository = new InMemoryDriverRideRepository();
  repository.rides.push(...rides);
  const eventBus = createFakeEventBus();
  const service = new DriverRideService(repository, stubRoutingService(), eventBus);
  await service.updateAvailability(driver, {
    online: true,
    latitude: 24.87,
    longitude: 67.02,
  });
  return {repository, service, eventBus};
}

describe("DriverRideService", () => {
  it("requires a boolean online flag and valid coordinates", async () => {
    const {service} = await onlineService([]);

    await expect(
      service.updateAvailability(driver, {online: "yes"}),
    ).rejects.toThrow("Availability online flag is required");
    await expect(
      service.updateAvailability(driver, {online: true, latitude: 999, longitude: 67}),
    ).rejects.toThrow("Driver location is invalid");
  });

  it("offers the oldest waiting ride to an online driver", async () => {
    const {repository, service} = await onlineService([
      waitingRide({id: "ride_late", requestedAt: "2026-07-13T10:05:00.000Z"}),
      waitingRide({id: "ride_early", requestedAt: "2026-07-13T10:01:00.000Z"}),
    ]);

    const ride = await service.getCurrentRide(driver);

    expect(ride?.id).toBe("ride_early");
    expect(ride?.state).toBe("offered_to_driver");
    expect(ride?.driverId).toBe("driver_1");
    expect(repository.transitions.map((t) => t.toState)).toEqual([
      "matching",
      "offered_to_driver",
    ]);
  });

  it("does not offer rides to an offline driver", async () => {
    const repository = new InMemoryDriverRideRepository();
    repository.rides.push(waitingRide());
    const service = new DriverRideService(
      repository,
      stubRoutingService(),
      createFakeEventBus(),
    );

    const ride = await service.getCurrentRide(driver);

    expect(ride).toBeNull();
  });

  it("returns the driver's active ride without claiming another", async () => {
    const {service} = await onlineService([
      waitingRide({id: "ride_active", state: "accepted", driverId: "driver_1"}),
      waitingRide({id: "ride_waiting"}),
    ]);

    const ride = await service.getCurrentRide(driver);

    expect(ride?.id).toBe("ride_active");
  });

  it("accepts an offered ride", async () => {
    const {service} = await onlineService();
    const offered = await service.getCurrentRide(driver);

    const accepted = await service.acceptRide(driver, offered!.id);

    expect(accepted.state).toBe("accepted");
  });

  it("returns a declined ride to the matching pool", async () => {
    const {repository, service} = await onlineService();
    const offered = await service.getCurrentRide(driver);

    const result = await service.declineRide(driver, offered!.id);

    expect(result).toEqual({declined: true});
    const ride = repository.rides.find((candidate) => candidate.id === offered!.id);
    expect(ride?.state).toBe("matching");
    expect(ride?.driverId).toBeNull();
    expect(repository.transitions.map((t) => t.toState)).toEqual([
      "matching",
      "offered_to_driver",
      "driver_timeout",
      "matching",
    ]);
  });

  it("advances the ride through driver progress states", async () => {
    const {service} = await onlineService();
    const offered = await service.getCurrentRide(driver);
    await service.acceptRide(driver, offered!.id);

    for (const state of [
      "driver_en_route_to_pickup",
      "arrived_at_pickup",
      "rider_onboarded",
      "in_progress",
      "arrived_at_destination",
    ]) {
      const ride = await service.advanceRide(driver, offered!.id, state);
      expect(ride.state).toBe(state);
    }
  });

  it("rejects skipping ahead in the state machine", async () => {
    const {service} = await onlineService();
    const offered = await service.getCurrentRide(driver);
    await service.acceptRide(driver, offered!.id);

    await expect(
      service.advanceRide(driver, offered!.id, "in_progress"),
    ).rejects.toThrow("Ride cannot move from accepted to in_progress");
    await expect(
      service.advanceRide(driver, offered!.id, "completed"),
    ).rejects.toThrow("Ride cannot advance to this state");
  });

  it("completes a ride and stamps the final fare", async () => {
    const {repository, service} = await onlineService();
    const offered = await service.getCurrentRide(driver);
    await service.acceptRide(driver, offered!.id);
    for (const state of [
      "driver_en_route_to_pickup",
      "arrived_at_pickup",
      "rider_onboarded",
      "in_progress",
      "arrived_at_destination",
    ]) {
      await service.advanceRide(driver, offered!.id, state);
    }

    const completed = await service.completeRide(driver, offered!.id);

    expect(completed.state).toBe("completed");
    expect(completed.finalFareMinor).toBe(35000);
    expect(repository.transitions.slice(-2).map((t) => t.toState)).toEqual([
      "payment_pending",
      "completed",
    ]);
  });

  it("allows the driver to cancel before pickup", async () => {
    const {service} = await onlineService();
    const offered = await service.getCurrentRide(driver);
    await service.acceptRide(driver, offered!.id);

    const cancelled = await service.cancelRide(driver, offered!.id);

    expect(cancelled.state).toBe("cancelled_by_driver");
  });

  it("hides rides that belong to other drivers", async () => {
    const {service} = await onlineService([
      waitingRide({id: "ride_other", state: "accepted", driverId: "driver_2"}),
    ]);

    await expect(service.acceptRide(driver, "ride_other")).rejects.toThrow(
      "Ride not found for this driver",
    );
  });

  it("records a location ping without touching the online flag", async () => {
    const {repository, service} = await onlineService([]);

    const presence = await service.updateLocation(driver, {
      latitude: 24.88,
      longitude: 67.03,
    });

    expect(presence.online).toBe(true);
    expect(presence.latitude).toBe(24.88);
    expect(repository.presences.get("driver_1")?.longitude).toBe(67.03);
    await expect(service.updateLocation(driver, {})).rejects.toThrow(
      "Driver location is required",
    );
  });

  it("returns the road route for the driver's ride", async () => {
    const {service} = await onlineService();
    const offered = await service.getCurrentRide(driver);

    const route = await service.getRideRoute(driver, offered!.id);

    expect(route.coordinates).toHaveLength(2);
    expect(route.distanceMeters).toBe(5200);
    await expect(service.getRideRoute(driver, "ride_missing")).rejects.toThrow(
      "Ride not found for this driver",
    );
  });

  it("publishes a ride.offer event when a ride is offered to a driver", async () => {
    const {service, eventBus} = await onlineService();

    const offered = await service.getCurrentRide(driver);

    expect(eventBus.publish).toHaveBeenCalledWith("ride.offer", {
      rideId: offered!.id,
      driverId: "driver_1",
    });
  });

  it("does not publish a ride.offer event when no ride is available", async () => {
    const {service, eventBus} = await onlineService([]);

    await service.getCurrentRide(driver);

    expect(eventBus.publish).not.toHaveBeenCalledWith(
      "ride.offer",
      expect.anything(),
    );
  });

  it("publishes ride.state_changed when a driver accepts a ride", async () => {
    const {service, eventBus} = await onlineService();
    const offered = await service.getCurrentRide(driver);
    eventBus.publish.mockClear();

    await service.acceptRide(driver, offered!.id);

    expect(eventBus.publish).toHaveBeenCalledWith(
      "ride.state_changed",
      expect.objectContaining({
        rideId: offered!.id,
        riderId: "rider_1",
        driverId: "driver_1",
        state: "accepted",
      }),
    );
  });

  it("publishes ride.state_changed when a driver declines an offer", async () => {
    const {service, eventBus} = await onlineService();
    const offered = await service.getCurrentRide(driver);
    eventBus.publish.mockClear();

    await service.declineRide(driver, offered!.id);

    expect(eventBus.publish).toHaveBeenCalledWith(
      "ride.state_changed",
      expect.objectContaining({
        rideId: offered!.id,
        state: "matching",
        driverId: null,
      }),
    );
  });

  it("publishes ride.state_changed on each advance step", async () => {
    const {service, eventBus} = await onlineService();
    const offered = await service.getCurrentRide(driver);
    await service.acceptRide(driver, offered!.id);
    eventBus.publish.mockClear();

    await service.advanceRide(driver, offered!.id, "driver_en_route_to_pickup");

    expect(eventBus.publish).toHaveBeenCalledWith(
      "ride.state_changed",
      expect.objectContaining({
        rideId: offered!.id,
        state: "driver_en_route_to_pickup",
      }),
    );
  });

  it("publishes ride.state_changed when a driver cancels", async () => {
    const {service, eventBus} = await onlineService();
    const offered = await service.getCurrentRide(driver);
    await service.acceptRide(driver, offered!.id);
    eventBus.publish.mockClear();

    await service.cancelRide(driver, offered!.id);

    expect(eventBus.publish).toHaveBeenCalledWith(
      "ride.state_changed",
      expect.objectContaining({
        rideId: offered!.id,
        state: "cancelled_by_driver",
      }),
    );
  });

  it("publishes ride.state_changed for both payment_pending and completed", async () => {
    const {service, eventBus} = await onlineService();
    const offered = await service.getCurrentRide(driver);
    await service.acceptRide(driver, offered!.id);
    for (const state of [
      "driver_en_route_to_pickup",
      "arrived_at_pickup",
      "rider_onboarded",
      "in_progress",
      "arrived_at_destination",
    ]) {
      await service.advanceRide(driver, offered!.id, state);
    }
    eventBus.publish.mockClear();

    await service.completeRide(driver, offered!.id);

    const publishedStates = eventBus.publish.mock.calls
      .filter(([name]) => name === "ride.state_changed")
      .map(([, payload]) => (payload as {state: string}).state);
    expect(publishedStates).toEqual(["payment_pending", "completed"]);
  });

  it("publishes ride.driver_location only when the driver has an active ride", async () => {
    const {service, eventBus} = await onlineService([]);

    await service.updateLocation(driver, {latitude: 24.88, longitude: 67.03});

    expect(eventBus.publish).not.toHaveBeenCalledWith(
      "ride.driver_location",
      expect.anything(),
    );
  });

  it("publishes ride.driver_location while an active ride is underway", async () => {
    const {service, eventBus} = await onlineService();
    const offered = await service.getCurrentRide(driver);
    await service.acceptRide(driver, offered!.id);
    eventBus.publish.mockClear();

    await service.updateLocation(driver, {latitude: 24.89, longitude: 67.04});

    expect(eventBus.publish).toHaveBeenCalledWith("ride.driver_location", {
      rideId: offered!.id,
      riderId: "rider_1",
      driverId: "driver_1",
      latitude: 24.89,
      longitude: 67.04,
      occurredAt: expect.any(String),
    });
  });

  it("lists finished rides and computes earnings windows", async () => {
    const {service} = await onlineService();
    const offered = await service.getCurrentRide(driver);
    await service.acceptRide(driver, offered!.id);
    for (const state of [
      "driver_en_route_to_pickup",
      "arrived_at_pickup",
      "rider_onboarded",
      "in_progress",
      "arrived_at_destination",
    ]) {
      await service.advanceRide(driver, offered!.id, state);
    }
    await service.completeRide(driver, offered!.id);

    const history = await service.getRideHistory(driver);
    const earnings = await service.getEarnings(driver);

    expect(history).toHaveLength(1);
    expect(history[0]?.state).toBe("completed");
    expect(earnings.today).toEqual({rides: 1, totalMinor: 35000});
    expect(earnings.week).toEqual({rides: 1, totalMinor: 35000});
    expect(earnings.currency).toBe("PKR");
  });
});
