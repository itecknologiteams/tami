import { Coordinates, RideCategoryCode } from "../bookings/booking.types";

export type AvailableRideCategory = {
  code: RideCategoryCode;
  name: string;
  description: string;
};

export type RiderCategoryCatalog = {
  categories: AvailableRideCategory[];
  scheduledRidesEnabled: boolean;
};
import { RouteCoordinate } from "../routing/routing.types";

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
  routeMethod: "osrm_v1";
  routeProvider: string;
  routeCoordinates: RouteCoordinate[];
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
