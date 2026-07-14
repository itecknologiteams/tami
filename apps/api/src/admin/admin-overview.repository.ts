import { RideState } from "@tami/shared";
import { AdminRideSummary } from "./admin-overview.types";

export abstract class AdminOverviewRepository {
  abstract rideCountsByState(): Promise<Partial<Record<RideState, number>>>;
  abstract completedRideCountSince(since: string): Promise<number>;
  abstract driverCounts(): Promise<{online: number; total: number}>;
  abstract recentRides(limit: number): Promise<AdminRideSummary[]>;
}
