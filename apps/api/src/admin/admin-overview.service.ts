import { Injectable } from "@nestjs/common";
import { RideState } from "@tami/shared";
import { AdminOverviewRepository } from "./admin-overview.repository";
import { AdminOverview } from "./admin-overview.types";

const activeRideStates: readonly RideState[] = [
  "requested",
  "matching",
  "offered_to_driver",
  "accepted",
  "driver_en_route_to_pickup",
  "arrived_at_pickup",
  "rider_onboarded",
  "in_progress",
  "arrived_at_destination",
  "payment_pending",
];

@Injectable()
export class AdminOverviewService {
  constructor(private readonly repository: AdminOverviewRepository) {}

  async getOverview(): Promise<AdminOverview> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [byState, completedToday, drivers, recentRides] = await Promise.all([
      this.repository.rideCountsByState(),
      this.repository.completedRideCountSince(startOfDay.toISOString()),
      this.repository.driverCounts(),
      this.repository.recentRides(20),
    ]);

    const active = activeRideStates.reduce(
      (sum, state) => sum + (byState[state] ?? 0),
      0,
    );

    return {
      generatedAt: now.toISOString(),
      drivers,
      rides: {active, completedToday, byState},
      recentRides,
    };
  }
}
