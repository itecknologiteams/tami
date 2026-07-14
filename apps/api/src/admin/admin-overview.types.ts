import { RideState } from "@tami/shared";

export type AdminRideSummary = {
  id: string;
  state: RideState;
  cityName: string;
  riderPhone: string;
  driverName: string | null;
  pickupAddress: string;
  destinationAddress: string;
  estimatedFareMinor: number | null;
  finalFareMinor: number | null;
  currency: string;
  requestedAt: string;
};

export type AdminOverview = {
  generatedAt: string;
  drivers: {
    online: number;
    total: number;
  };
  rides: {
    active: number;
    completedToday: number;
    byState: Partial<Record<RideState, number>>;
  };
  recentRides: AdminRideSummary[];
};
