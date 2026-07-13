import { BadRequestException, Injectable } from "@nestjs/common";
import { assertRideStateTransition } from "@tami/shared";
import { BookingRepository } from "./booking.repository";
import {
  BookingRide,
  CreateRideForRiderRequest,
  RiderPaymentMethod,
} from "./booking.types";
import { PricingService } from "../pricing/pricing.service";

@Injectable()
export class BookingService {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly pricingService: PricingService,
  ) {}

  async createRide(request: CreateRideForRiderRequest): Promise<BookingRide> {
    if (!idempotencyKeyPattern.test(request.idempotencyKey)) {
      throw new BadRequestException("Idempotency key is invalid");
    }
    if (!paymentMethods.has(request.paymentMethod)) {
      throw new BadRequestException("Payment method is invalid");
    }
    const existingRide = await this.bookingRepository.findRideByIdempotencyKey(
      request.riderId,
      request.idempotencyKey,
    );
    if (existingRide != null) {
      return existingRide;
    }
    const estimate = await this.pricingService.estimateFare({
      cityId: request.cityId,
      categoryCode: request.categoryCode,
      pickup: request.pickup,
      destination: request.destination,
      ...(request.scheduledPickupAt == null
        ? {}
        : {scheduledPickupAt: request.scheduledPickupAt}),
    });
    const requestedAt = new Date().toISOString();
    return this.bookingRepository.createRideWithInitialTransition(
      {
        ...request,
        estimatedFareMinor: estimate.fareMinor,
        currency: estimate.currency,
        farePolicyId: estimate.policyId,
        farePolicyVersion: estimate.policyVersion,
        fareMultiplier: estimate.multiplier,
        routeDistanceMeters: estimate.distanceMeters,
        routeDurationSeconds: estimate.durationSeconds,
      },
      requestedAt,
    );
  }

  async cancelRide({
    rideId,
    riderId,
  }: {
    rideId: string;
    riderId: string;
  }): Promise<BookingRide | null> {
    const ride = await this.bookingRepository.findRideForRider(rideId, riderId);
    if (ride == null) {
      return null;
    }

    const occurredAt = new Date().toISOString();
    const transition = assertRideStateTransition({
      rideId,
      from: ride.state,
      to: "cancelled_by_rider",
      actorType: "rider",
      actorId: riderId,
      occurredAt,
      source: "rider_app",
    });
    return this.bookingRepository.changeRideStateForRider({
      rideId,
      riderId,
      fromState: transition.from,
      toState: transition.to,
      occurredAt,
    });
  }
}

const paymentMethods = new Set<RiderPaymentMethod>([
  "cash",
  "jazzcash",
  "easypaisa",
  "nayapay",
]);

const idempotencyKeyPattern = /^[A-Za-z0-9_-]{16,128}$/;
