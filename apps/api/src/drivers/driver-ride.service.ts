import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { assertRideStateTransition, RideState } from "@tami/shared";
import { AuthenticatedDriver } from "../auth/driver-auth.types";
import { RealtimeEventBus } from "../realtime/realtime-event-bus";
import { RoutingService } from "../routing/routing.service";
import { RoutePreview } from "../routing/routing.types";
import {
  driverAdvanceStates,
  DriverEarnings,
  DriverPresence,
  DriverRideView,
} from "./driver-ride.types";
import { DriverRideRepository } from "./driver-ride.repository";

type AvailabilityRequest = {
  online: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

@Injectable()
export class DriverRideService {
  constructor(
    private readonly repository: DriverRideRepository,
    private readonly routingService: RoutingService,
    private readonly realtimeEventBus: RealtimeEventBus,
  ) {}

  async updateAvailability(
    driver: AuthenticatedDriver,
    request: AvailabilityRequest,
  ): Promise<DriverPresence> {
    if (typeof request.online !== "boolean") {
      throw new BadRequestException("Availability online flag is required");
    }
    const location = parseOptionalLocation(request.latitude, request.longitude);
    return this.repository.updateAvailability({
      driverId: driver.id,
      online: request.online,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      occurredAt: new Date().toISOString(),
    });
  }

  async getCurrentRide(
    driver: AuthenticatedDriver,
  ): Promise<DriverRideView | null> {
    const activeRide = await this.repository.findActiveRideForDriver(driver.id);
    if (activeRide != null) {
      return activeRide;
    }
    const offeredRide = await this.repository.claimNextRideForDriver({
      driverId: driver.id,
      cityId: driver.cityId,
      occurredAt: new Date().toISOString(),
    });
    if (offeredRide != null) {
      this.realtimeEventBus.publish("ride.offer", {
        rideId: offeredRide.id,
        driverId: driver.id,
      });
    }
    return offeredRide;
  }

  async acceptRide(
    driver: AuthenticatedDriver,
    rideId: string,
  ): Promise<DriverRideView> {
    const ride = await this.requireRide(driver, rideId);
    return this.transition(driver, ride, "accepted", "driver");
  }

  async declineRide(
    driver: AuthenticatedDriver,
    rideId: string,
  ): Promise<{declined: true}> {
    const ride = await this.requireRide(driver, rideId);
    if (ride.state !== "offered_to_driver") {
      throw new ConflictException("Only offered rides can be declined");
    }
    const occurredAt = new Date().toISOString();
    const declined = await this.repository.declineOfferForDriver({
      rideId,
      driverId: driver.id,
      occurredAt,
    });
    if (declined == null) {
      throw new ConflictException("Ride offer has already changed");
    }
    this.publishRideStateChanged(declined, occurredAt);
    return {declined: true};
  }

  async advanceRide(
    driver: AuthenticatedDriver,
    rideId: string,
    to: unknown,
  ): Promise<DriverRideView> {
    if (
      typeof to !== "string" ||
      !driverAdvanceStates.includes(to as RideState)
    ) {
      throw new BadRequestException("Ride cannot advance to this state");
    }
    const ride = await this.requireRide(driver, rideId);
    return this.transition(driver, ride, to as RideState, "driver");
  }

  async cancelRide(
    driver: AuthenticatedDriver,
    rideId: string,
  ): Promise<DriverRideView> {
    const ride = await this.requireRide(driver, rideId);
    return this.transition(driver, ride, "cancelled_by_driver", "driver");
  }

  async completeRide(
    driver: AuthenticatedDriver,
    rideId: string,
  ): Promise<DriverRideView> {
    const ride = await this.requireRide(driver, rideId);
    if (ride.state !== "arrived_at_destination") {
      throw new ConflictException(
        "Ride must arrive at the destination before completion",
      );
    }
    const pending = await this.transition(
      driver,
      ride,
      "payment_pending",
      "system",
    );
    const finalFareMinor = pending.estimatedFareMinor ?? 0;
    const occurredAt = new Date().toISOString();
    const completed = await this.repository.changeRideStateForDriver({
      rideId,
      driverId: driver.id,
      fromState: assertRideStateTransition({
        rideId,
        from: pending.state,
        to: "completed",
        actorType: "driver",
        actorId: driver.id,
        occurredAt,
        source: "driver_app",
      }).from,
      toState: "completed",
      actorType: "driver",
      actorId: driver.id,
      source: "driver_app",
      occurredAt,
      finalFareMinor,
    });
    if (completed == null) {
      throw new ConflictException("Ride state changed while completing");
    }
    this.publishRideStateChanged(completed, occurredAt);
    return completed;
  }

  async updateLocation(
    driver: AuthenticatedDriver,
    request: {latitude?: unknown; longitude?: unknown},
  ): Promise<DriverPresence> {
    const location = parseOptionalLocation(request.latitude, request.longitude);
    if (location == null) {
      throw new BadRequestException("Driver location is required");
    }
    const occurredAt = new Date().toISOString();
    const presence = await this.repository.updateLocation({
      driverId: driver.id,
      latitude: location.latitude,
      longitude: location.longitude,
      occurredAt,
    });
    const activeRide = await this.repository.findActiveRideForDriver(driver.id);
    if (activeRide != null) {
      this.realtimeEventBus.publish("ride.driver_location", {
        rideId: activeRide.id,
        riderId: activeRide.riderId,
        driverId: driver.id,
        latitude: location.latitude,
        longitude: location.longitude,
        occurredAt,
      });
    }
    return presence;
  }

  async getRideRoute(
    driver: AuthenticatedDriver,
    rideId: string,
  ): Promise<RoutePreview> {
    const ride = await this.requireRide(driver, rideId);
    return this.routingService.previewDrivingRoute(
      ride.pickup,
      ride.destination,
    );
  }

  async getRideHistory(
    driver: AuthenticatedDriver,
  ): Promise<DriverRideView[]> {
    return this.repository.listFinishedRidesForDriver(driver.id, 20);
  }

  async getEarnings(driver: AuthenticatedDriver): Promise<DriverEarnings> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return this.repository.earningsForDriver({
      driverId: driver.id,
      todayStart: todayStart.toISOString(),
      weekStart: weekStart.toISOString(),
    });
  }

  private async requireRide(
    driver: AuthenticatedDriver,
    rideId: string,
  ): Promise<DriverRideView> {
    const ride = await this.repository.findRideForDriver(rideId, driver.id);
    if (ride == null) {
      throw new NotFoundException("Ride not found for this driver");
    }
    return ride;
  }

  private async transition(
    driver: AuthenticatedDriver,
    ride: DriverRideView,
    to: RideState,
    actorType: "driver" | "system",
  ): Promise<DriverRideView> {
    const occurredAt = new Date().toISOString();
    let transition;
    try {
      transition = assertRideStateTransition({
        rideId: ride.id,
        from: ride.state,
        to,
        actorType,
        actorId: actorType === "driver" ? driver.id : "dispatch",
        occurredAt,
        source: actorType === "driver" ? "driver_app" : "system",
      });
    } catch {
      throw new ConflictException(
        `Ride cannot move from ${ride.state} to ${to}`,
      );
    }
    const updated = await this.repository.changeRideStateForDriver({
      rideId: ride.id,
      driverId: driver.id,
      fromState: transition.from,
      toState: transition.to,
      actorType,
      actorId: transition.actorId,
      source: actorType === "driver" ? "driver_app" : "system",
      occurredAt,
    });
    if (updated == null) {
      throw new ConflictException("Ride state changed, refresh and retry");
    }
    this.publishRideStateChanged(updated, occurredAt);
    return updated;
  }

  private publishRideStateChanged(
    ride: DriverRideView,
    occurredAt: string,
  ): void {
    this.realtimeEventBus.publish("ride.state_changed", {
      rideId: ride.id,
      riderId: ride.riderId,
      driverId: ride.driverId,
      state: ride.state,
      occurredAt,
    });
  }
}

function parseOptionalLocation(
  latitudeValue: unknown,
  longitudeValue: unknown,
): {latitude: number; longitude: number} | null {
  if (latitudeValue == null && longitudeValue == null) {
    return null;
  }
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new BadRequestException("Driver location is invalid");
  }
  return {latitude, longitude};
}
