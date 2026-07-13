import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PricingRepository } from "./pricing.repository";
import {
  FareEstimate,
  FareEstimateRequest,
  RiderCategoryCatalog,
} from "./pricing.types";
import { rideCategoryCodes, RideCategoryCode } from "../bookings/booking.types";
import { RoutingService } from "../routing/routing.service";

@Injectable()
export class PricingService {
  constructor(
    private readonly repository: PricingRepository,
    private readonly routingService: RoutingService,
  ) {}

  getAvailableCategories(cityId: string): Promise<RiderCategoryCatalog> {
    return this.repository.findAvailableCategories(cityId);
  }

  async estimateFare(request: FareEstimateRequest): Promise<FareEstimate> {
    this.validateCategory(request?.categoryCode);
    this.validateScheduling(request.categoryCode, request.scheduledPickupAt);
    this.validateLocation(request.pickup, "Pickup");
    this.validateLocation(request.destination, "Destination");
    if (
      request.pickup.latitude === request.destination.latitude &&
      request.pickup.longitude === request.destination.longitude
    ) {
      throw new BadRequestException("Pickup and destination must be different");
    }

    const policy = await this.repository.findActivePolicy(
      request.cityId,
      request.categoryCode,
    );
    if (policy == null) {
      throw new NotFoundException("Fare policy is unavailable for this ride");
    }
    this.validatePolicy(policy);

    const route = await this.routingService.previewDrivingRoute(
      request.pickup,
      request.destination,
    );
    const distanceMeters = route.distanceMeters;
    const durationSeconds = route.durationSeconds;
    const distanceFareMinor = Math.round(
      (distanceMeters / 1000) * policy.perKilometerMinor,
    );
    const timeFareMinor = Math.round(
      (durationSeconds / 60) * policy.perMinuteMinor,
    );
    const subtotalMinor =
      policy.baseFareMinor +
      distanceFareMinor +
      timeFareMinor +
      policy.bookingFeeMinor;
    const multiplier = roundMultiplier(
      Math.min(
        policy.categoryMultiplier * policy.demandMultiplier,
        policy.maximumMultiplier,
      ),
    );
    const multipliedFare = Math.round(subtotalMinor * multiplier);
    const minimumApplied = multipliedFare < policy.minimumFareMinor;
    let fareMinor = Math.max(multipliedFare, policy.minimumFareMinor);
    let capApplied = false;
    if (policy.maximumFareMinor != null && fareMinor > policy.maximumFareMinor) {
      fareMinor = policy.maximumFareMinor;
      capApplied = true;
    }

    const explanationLines = [
      `Base fare ${policy.currency} ${formatMinor(policy.baseFareMinor)}`,
      `${(distanceMeters / 1000).toFixed(1)} km and ${Math.ceil(
        durationSeconds / 60,
      )} min included`,
    ];
    if (multiplier > 1) {
      explanationLines.push(`${multiplier.toFixed(2)}x policy multiplier applied`);
    }
    if (minimumApplied) {
      explanationLines.push("Minimum fare applied");
    }
    if (capApplied) {
      explanationLines.push("Maximum fare cap applied");
    }
    explanationLines.push(`Policy version ${policy.version}`);

    return {
      fareMinor,
      currency: policy.currency,
      policyId: policy.id,
      policyVersion: policy.version,
      distanceMeters,
      durationSeconds,
      routeMethod: route.method,
      routeProvider: route.provider,
      routeCoordinates: route.coordinates,
      multiplier,
      capApplied,
      breakdown: {
        baseFareMinor: policy.baseFareMinor,
        distanceFareMinor,
        timeFareMinor,
        bookingFeeMinor: policy.bookingFeeMinor,
        subtotalMinor,
      },
      explanationLines,
    };
  }

  private validateLocation(
    location: FareEstimateRequest["pickup"],
    label: string,
  ): void {
    if (
      !Number.isFinite(location?.latitude) ||
      location.latitude < -90 ||
      location.latitude > 90
    ) {
      throw new BadRequestException(`${label} latitude is invalid`);
    }
    if (
      !Number.isFinite(location.longitude) ||
      location.longitude < -180 ||
      location.longitude > 180
    ) {
      throw new BadRequestException(`${label} longitude is invalid`);
    }
    if (typeof location.address !== "string" || location.address.trim().length === 0) {
      throw new BadRequestException(`${label} address cannot be empty`);
    }
  }

  private validateCategory(categoryCode: unknown): asserts categoryCode is RideCategoryCode {
    if (
      typeof categoryCode !== "string" ||
      !rideCategoryCodes.includes(categoryCode as RideCategoryCode)
    ) {
      throw new BadRequestException("Ride category is invalid");
    }
  }

  private validateScheduling(
    categoryCode: RideCategoryCode,
    scheduledPickupAt: string | undefined,
  ): void {
    if (scheduledPickupAt != null && categoryCode !== "scheduled_ride") {
      throw new BadRequestException(
        "Scheduled pickup time requires scheduled_ride category",
      );
    }
    if (scheduledPickupAt == null && categoryCode === "scheduled_ride") {
      throw new BadRequestException("Scheduled rides require a pickup time");
    }
    if (scheduledPickupAt == null) {
      return;
    }
    if (typeof scheduledPickupAt !== "string") {
      throw new BadRequestException("Scheduled pickup time is invalid");
    }

    const scheduledPickupTime = Date.parse(scheduledPickupAt);
    if (!Number.isFinite(scheduledPickupTime)) {
      throw new BadRequestException("Scheduled pickup time is invalid");
    }
    const now = Date.now();
    if (scheduledPickupTime <= now) {
      throw new BadRequestException("Scheduled pickup time must be in the future");
    }
    if (scheduledPickupTime > now + 90 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException("Scheduled pickup time must be within 90 days");
    }
  }

  private validatePolicy(policy: Awaited<ReturnType<PricingRepository["findActivePolicy"]>> & {}): void {
    const nonNegativeValues = [
      policy.baseFareMinor,
      policy.perKilometerMinor,
      policy.perMinuteMinor,
      policy.bookingFeeMinor,
      policy.minimumFareMinor,
    ];
    const positiveValues = [
      policy.version,
      policy.demandMultiplier,
      policy.maximumMultiplier,
      policy.roadFactor,
      policy.averageSpeedKph,
      policy.categoryMultiplier,
    ];
    const hasInvalidValues =
      nonNegativeValues.some((value) => !Number.isFinite(value) || value < 0) ||
      positiveValues.some((value) => !Number.isFinite(value) || value <= 0) ||
      policy.maximumMultiplier < policy.demandMultiplier ||
      (policy.maximumFareMinor != null &&
        (!Number.isFinite(policy.maximumFareMinor) ||
          policy.maximumFareMinor < policy.minimumFareMinor)) ||
      policy.currency.trim().length === 0;
    if (hasInvalidValues) {
      throw new Error("Active fare policy is invalid");
    }
  }
}

function roundMultiplier(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatMinor(value: number): string {
  return (value / 100).toFixed(value % 100 === 0 ? 0 : 2);
}
