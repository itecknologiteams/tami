import { Coordinates, RideCategoryCode } from "../bookings/booking.types";

export type PricingPolicy = {
  id: string;
  cityId: string;
  version: number;
  currency: string;
  baseFareMinor: number;
  perKilometerMinor: number;
  perMinuteMinor: number;
  bookingFeeMinor: number;
  minimumFareMinor: number;
  demandMultiplier: number;
  maximumMultiplier: number;
  maximumFareMinor: number | null;
  roadFactor: number;
  averageSpeedKph: number;
  categoryMultiplier: number;
};

export type FareEstimateRequest = {
  cityId: string;
  categoryCode: RideCategoryCode;
  pickup: Coordinates;
  destination: Coordinates;
  scheduledPickupAt?: string;
};

export type FareEstimate = {
  fareMinor: number;
  currency: string;
  policyId: string;
  policyVersion: number;
  distanceMeters: number;
  durationSeconds: number;
  routeMethod: "great_circle_road_factor_v1";
  multiplier: number;
  capApplied: boolean;
  breakdown: {
    baseFareMinor: number;
    distanceFareMinor: number;
    timeFareMinor: number;
    bookingFeeMinor: number;
    subtotalMinor: number;
  };
  explanationLines: string[];
};

export type FareEstimatePayload = Omit<FareEstimateRequest, "cityId">;
