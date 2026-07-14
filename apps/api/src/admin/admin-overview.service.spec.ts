import { describe, expect, it } from "vitest";
import { RideState } from "@tami/shared";
import { AdminOverviewRepository } from "./admin-overview.repository";
import { AdminOverviewService } from "./admin-overview.service";
import { AdminRideSummary } from "./admin-overview.types";

class StubAdminOverviewRepository extends AdminOverviewRepository {
  constructor(
    private readonly counts: Partial<Record<RideState, number>>,
    private readonly completed: number,
    private readonly drivers: {online: number; total: number},
    private readonly rides: AdminRideSummary[],
  ) {
    super();
  }

  async rideCountsByState() {
    return this.counts;
  }

  async completedRideCountSince() {
    return this.completed;
  }

  async driverCounts() {
    return this.drivers;
  }

  async recentRides() {
    return this.rides;
  }
}

describe("AdminOverviewService", () => {
  it("aggregates active rides, driver presence, and recent rides", async () => {
    const repository = new StubAdminOverviewRepository(
      {requested: 2, in_progress: 1, completed: 40, cancelled_by_rider: 3},
      7,
      {online: 4, total: 12},
      [
        {
          id: "ride_1",
          state: "in_progress",
          cityName: "Karachi",
          riderPhone: "+923001234567",
          driverName: "Driver 6543",
          pickupAddress: "Saddar",
          destinationAddress: "Gulshan",
          estimatedFareMinor: 35000,
          finalFareMinor: null,
          currency: "PKR",
          requestedAt: "2026-07-13T10:00:00.000Z",
        },
      ],
    );
    const service = new AdminOverviewService(repository);

    const overview = await service.getOverview();

    expect(overview.rides.active).toBe(3);
    expect(overview.rides.completedToday).toBe(7);
    expect(overview.rides.byState.completed).toBe(40);
    expect(overview.drivers).toEqual({online: 4, total: 12});
    expect(overview.recentRides).toHaveLength(1);
    expect(overview.generatedAt).toEqual(expect.any(String));
  });
});
