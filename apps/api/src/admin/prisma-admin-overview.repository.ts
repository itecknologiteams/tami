import { Injectable } from "@nestjs/common";
import { RideState } from "@tami/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AdminOverviewRepository } from "./admin-overview.repository";
import { AdminRideSummary } from "./admin-overview.types";

@Injectable()
export class PrismaAdminOverviewRepository extends AdminOverviewRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async rideCountsByState(): Promise<Partial<Record<RideState, number>>> {
    const groups = await this.prisma.ride.groupBy({
      by: ["state"],
      _count: {_all: true},
    });
    const counts: Partial<Record<RideState, number>> = {};
    for (const group of groups) {
      counts[group.state as RideState] = group._count._all;
    }
    return counts;
  }

  async completedRideCountSince(since: string): Promise<number> {
    return this.prisma.ride.count({
      where: {state: "completed", updatedAt: {gte: new Date(since)}},
    });
  }

  async driverCounts(): Promise<{online: number; total: number}> {
    const [online, total] = await Promise.all([
      this.prisma.driver.count({where: {online: true, active: true}}),
      this.prisma.driver.count({where: {active: true}}),
    ]);
    return {online, total};
  }

  async recentRides(limit: number): Promise<AdminRideSummary[]> {
    const rides = await this.prisma.ride.findMany({
      orderBy: {requestedAt: "desc"},
      take: limit,
      include: {
        city: {select: {name: true}},
        rider: {select: {phone: true}},
        driver: {select: {name: true}},
      },
    });
    return rides.map((ride) => ({
      id: ride.id,
      state: ride.state as RideState,
      cityName: ride.city.name,
      riderPhone: ride.rider.phone,
      driverName: ride.driver?.name ?? null,
      pickupAddress: ride.pickupAddress,
      destinationAddress: ride.destinationAddress,
      estimatedFareMinor: ride.estimatedFareMinor,
      finalFareMinor: ride.finalFareMinor,
      currency: ride.currency,
      requestedAt: ride.requestedAt.toISOString(),
    }));
  }
}
