import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { RideState } from "@tami/shared";
import { RideCategoryCode } from "../bookings/booking.types";
import { PrismaService } from "../prisma/prisma.service";
import { DriverRideRepository } from "./driver-ride.repository";
import {
  driverActiveRideStates,
  driverFinishedRideStates,
  DriverEarnings,
  DriverPresence,
  DriverRideStateChange,
  DriverRideView,
} from "./driver-ride.types";

const rideInclude = {
  category: {select: {code: true}},
  rider: {select: {phone: true}},
} satisfies Prisma.RideInclude;

type RideRecord = Prisma.RideGetPayload<{include: typeof rideInclude}>;

function toDriverRideView(ride: RideRecord): DriverRideView {
  return {
    id: ride.id,
    state: ride.state as RideState,
    cityId: ride.cityId,
    riderId: ride.riderId,
    riderPhone: ride.rider?.phone ?? null,
    driverId: ride.driverId,
    categoryCode: ride.category.code as RideCategoryCode,
    pickup: {
      latitude: ride.pickupLatitude.toNumber(),
      longitude: ride.pickupLongitude.toNumber(),
      address: ride.pickupAddress,
    },
    destination: {
      latitude: ride.destinationLatitude.toNumber(),
      longitude: ride.destinationLongitude.toNumber(),
      address: ride.destinationAddress,
    },
    estimatedFareMinor: ride.estimatedFareMinor,
    finalFareMinor: ride.finalFareMinor,
    currency: ride.currency,
    requestedAt: ride.requestedAt.toISOString(),
    scheduledPickupAt: ride.scheduledPickupAt?.toISOString() ?? null,
  };
}

@Injectable()
export class PrismaDriverRideRepository extends DriverRideRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async updateAvailability(input: {
    driverId: string;
    online: boolean;
    latitude: number | null;
    longitude: number | null;
    occurredAt: string;
  }): Promise<DriverPresence> {
    const driver = await this.prisma.driver.update({
      where: {id: input.driverId},
      data: {
        online: input.online,
        ...(input.online ? {lastOnlineAt: new Date(input.occurredAt)} : {}),
        ...(input.latitude != null && input.longitude != null
          ? {latitude: input.latitude, longitude: input.longitude}
          : {}),
      },
    });
    return {
      driverId: driver.id,
      online: driver.online,
      latitude: driver.latitude?.toNumber() ?? null,
      longitude: driver.longitude?.toNumber() ?? null,
      lastOnlineAt: driver.lastOnlineAt?.toISOString() ?? null,
    };
  }

  async findActiveRideForDriver(
    driverId: string,
  ): Promise<DriverRideView | null> {
    const ride = await this.prisma.ride.findFirst({
      where: {
        driverId,
        state: {in: driverActiveRideStates as RideState[]},
      },
      orderBy: {requestedAt: "asc"},
      include: rideInclude,
    });
    return ride ? toDriverRideView(ride) : null;
  }

  async findRideForDriver(
    rideId: string,
    driverId: string,
  ): Promise<DriverRideView | null> {
    const ride = await this.prisma.ride.findFirst({
      where: {id: rideId, driverId},
      include: rideInclude,
    });
    return ride ? toDriverRideView(ride) : null;
  }

  async claimNextRideForDriver(input: {
    driverId: string;
    cityId: string;
    occurredAt: string;
  }): Promise<DriverRideView | null> {
    const occurredAt = new Date(input.occurredAt);
    return this.prisma.$transaction(async (transaction) => {
      const driver = await transaction.driver.findFirst({
        where: {id: input.driverId, online: true, active: true},
        select: {id: true},
      });
      if (driver == null) {
        return null;
      }

      const candidate = await transaction.ride.findFirst({
        where: {
          cityId: input.cityId,
          driverId: null,
          state: {in: ["requested", "matching"]},
          OR: [
            {scheduledPickupAt: null},
            {scheduledPickupAt: {lte: occurredAt}},
          ],
        },
        orderBy: {requestedAt: "asc"},
        select: {id: true, state: true},
      });
      if (candidate == null) {
        return null;
      }

      const claimed = await transaction.ride.updateMany({
        where: {id: candidate.id, state: candidate.state, driverId: null},
        data: {state: "offered_to_driver", driverId: input.driverId},
      });
      if (claimed.count === 0) {
        return null;
      }

      if (candidate.state === "requested") {
        await transaction.rideStateTransition.create({
          data: {
            rideId: candidate.id,
            fromState: "requested",
            toState: "matching",
            actorType: "system",
            actorId: "dispatch",
            source: "system",
            occurredAt,
          },
        });
      }
      await transaction.rideStateTransition.create({
        data: {
          rideId: candidate.id,
          fromState: "matching",
          toState: "offered_to_driver",
          actorType: "system",
          actorId: "dispatch",
          source: "system",
          occurredAt,
        },
      });

      const ride = await transaction.ride.findUniqueOrThrow({
        where: {id: candidate.id},
        include: rideInclude,
      });
      return toDriverRideView(ride);
    });
  }

  async changeRideStateForDriver(
    change: DriverRideStateChange,
  ): Promise<DriverRideView | null> {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.ride.findFirst({
        where: {
          id: change.rideId,
          driverId: change.driverId,
          state: change.fromState,
        },
        select: {id: true},
      });
      if (existing == null) {
        return null;
      }

      const ride = await transaction.ride.update({
        where: {id: existing.id},
        data: {
          state: change.toState,
          ...(change.finalFareMinor != null
            ? {finalFareMinor: change.finalFareMinor}
            : {}),
        },
        include: rideInclude,
      });
      await transaction.rideStateTransition.create({
        data: {
          rideId: change.rideId,
          fromState: change.fromState,
          toState: change.toState,
          actorType: change.actorType,
          actorId: change.actorId,
          source: change.source,
          occurredAt: new Date(change.occurredAt),
        },
      });
      if (change.toState === "completed") {
        await transaction.paymentRecord.updateMany({
          where: {rideId: change.rideId, status: "pending"},
          data: {status: "paid", collectedById: change.driverId},
        });
      }
      return toDriverRideView(ride);
    });
  }

  async declineOfferForDriver(input: {
    rideId: string;
    driverId: string;
    occurredAt: string;
  }): Promise<DriverRideView | null> {
    const occurredAt = new Date(input.occurredAt);
    return this.prisma.$transaction(async (transaction) => {
      const declined = await transaction.ride.updateMany({
        where: {
          id: input.rideId,
          driverId: input.driverId,
          state: "offered_to_driver",
        },
        data: {state: "matching", driverId: null},
      });
      if (declined.count === 0) {
        return null;
      }
      await transaction.rideStateTransition.createMany({
        data: [
          {
            rideId: input.rideId,
            fromState: "offered_to_driver",
            toState: "driver_timeout",
            actorType: "driver",
            actorId: input.driverId,
            source: "driver_app",
            occurredAt,
          },
          {
            rideId: input.rideId,
            fromState: "driver_timeout",
            toState: "matching",
            actorType: "system",
            actorId: "dispatch",
            source: "system",
            occurredAt,
          },
        ],
      });
      const ride = await transaction.ride.findUniqueOrThrow({
        where: {id: input.rideId},
        include: rideInclude,
      });
      return toDriverRideView(ride);
    });
  }

  async updateLocation(input: {
    driverId: string;
    latitude: number;
    longitude: number;
    occurredAt: string;
  }): Promise<DriverPresence> {
    const driver = await this.prisma.driver.update({
      where: {id: input.driverId},
      data: {latitude: input.latitude, longitude: input.longitude},
    });
    return {
      driverId: driver.id,
      online: driver.online,
      latitude: driver.latitude?.toNumber() ?? null,
      longitude: driver.longitude?.toNumber() ?? null,
      lastOnlineAt: driver.lastOnlineAt?.toISOString() ?? null,
    };
  }

  async listFinishedRidesForDriver(
    driverId: string,
    limit: number,
  ): Promise<DriverRideView[]> {
    const rides = await this.prisma.ride.findMany({
      where: {
        driverId,
        state: {in: driverFinishedRideStates as RideState[]},
      },
      orderBy: {updatedAt: "desc"},
      take: limit,
      include: rideInclude,
    });
    return rides.map(toDriverRideView);
  }

  async earningsForDriver(input: {
    driverId: string;
    todayStart: string;
    weekStart: string;
  }): Promise<DriverEarnings> {
    const window = async (start: string) => {
      const aggregate = await this.prisma.ride.aggregate({
        where: {
          driverId: input.driverId,
          state: "completed",
          updatedAt: {gte: new Date(start)},
        },
        _count: {_all: true},
        _sum: {finalFareMinor: true},
      });
      return {
        rides: aggregate._count._all,
        totalMinor: aggregate._sum.finalFareMinor ?? 0,
      };
    };
    const [today, week] = await Promise.all([
      window(input.todayStart),
      window(input.weekStart),
    ]);
    return {currency: "PKR", today, week};
  }
}
