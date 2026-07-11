import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BookingRepository } from "./booking.repository";
import {
  BookingRide,
  BookingRidePage,
  BookingRideTransition,
  CreateRideForRiderRequest,
  RiderRideStateChange,
  terminalRideStates,
} from "./booking.types";
import { PrismaService } from "../prisma/prisma.service";

type PersistedRide = Prisma.RideGetPayload<{
  include: { category: true };
}>;

function toNumber(value: { toNumber(): number } | number): number {
  return typeof value === "number" ? value : value.toNumber();
}

function toBookingRide(ride: PersistedRide): BookingRide {
  return {
    id: ride.id,
    cityId: ride.cityId,
    riderId: ride.riderId,
    categoryCode: ride.category.code,
    state: ride.state,
    pickup: {
      latitude: toNumber(ride.pickupLatitude),
      longitude: toNumber(ride.pickupLongitude),
      address: ride.pickupAddress,
    },
    destination: {
      latitude: toNumber(ride.destinationLatitude),
      longitude: toNumber(ride.destinationLongitude),
      address: ride.destinationAddress,
    },
    scheduledPickupAt: ride.scheduledPickupAt?.toISOString() ?? null,
    requestedAt: ride.requestedAt.toISOString(),
  };
}

@Injectable()
export class PrismaBookingRepository extends BookingRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createRideWithInitialTransition(
    request: CreateRideForRiderRequest,
    requestedAt: string,
  ): Promise<BookingRide> {
    return this.prisma.$transaction(async (transaction) => {
      const ride = await transaction.ride.create({
        data: {
          city: { connect: { id: request.cityId } },
          rider: { connect: { id: request.riderId } },
          category: { connect: { code: request.categoryCode } },
          state: "requested",
          pickupLatitude: request.pickup.latitude,
          pickupLongitude: request.pickup.longitude,
          pickupAddress: request.pickup.address,
          destinationLatitude: request.destination.latitude,
          destinationLongitude: request.destination.longitude,
          destinationAddress: request.destination.address,
          scheduledPickupAt: request.scheduledPickupAt
            ? new Date(request.scheduledPickupAt)
            : null,
          requestedAt: new Date(requestedAt),
        },
        include: { category: true },
      });

      await transaction.rideStateTransition.create({
        data: {
          rideId: ride.id,
          fromState: null,
          toState: "requested",
          actorType: "rider",
          actorId: request.riderId,
          occurredAt: new Date(requestedAt),
        },
      });

      return toBookingRide(ride);
    });
  }

  async recordTransition(
    transition: Omit<BookingRideTransition, "id">,
  ): Promise<BookingRideTransition> {
    const recordedTransition = await this.prisma.rideStateTransition.create({
      data: {
        rideId: transition.rideId,
        fromState: transition.fromState,
        toState: transition.toState,
        actorType: transition.actorType,
        actorId: transition.actorId,
        occurredAt: new Date(transition.occurredAt),
      },
    });

    return {
      id: recordedTransition.id,
      rideId: recordedTransition.rideId,
      fromState: recordedTransition.fromState,
      toState: recordedTransition.toState,
      actorType: recordedTransition.actorType as BookingRideTransition["actorType"],
      actorId: recordedTransition.actorId,
      occurredAt: recordedTransition.occurredAt.toISOString(),
    };
  }

  async findRideForRider(
    rideId: string,
    riderId: string,
  ): Promise<BookingRide | null> {
    const ride = await this.prisma.ride.findFirst({
      where: { id: rideId, riderId },
      include: { category: true },
    });
    return ride == null ? null : toBookingRide(ride);
  }

  async findCurrentRideForRider(
    riderId: string,
    now: Date,
  ): Promise<BookingRide | null> {
    const ride = await this.prisma.ride.findFirst({
      where: {
        riderId,
        state: {notIn: [...terminalRideStates]},
        OR: [{scheduledPickupAt: null}, {scheduledPickupAt: {lte: now}}],
      },
      orderBy: [{requestedAt: "desc"}, {id: "desc"}],
      include: {category: true},
    });
    return ride == null ? null : toBookingRide(ride);
  }

  async findUpcomingRidesForRider(
    riderId: string,
    now: Date,
  ): Promise<BookingRide[]> {
    const rides = await this.prisma.ride.findMany({
      where: {
        riderId,
        state: {notIn: [...terminalRideStates]},
        scheduledPickupAt: {gt: now},
      },
      orderBy: [{scheduledPickupAt: "asc"}, {id: "asc"}],
      include: {category: true},
    });
    return rides.map(toBookingRide);
  }

  async findRideHistoryForRider(
    riderId: string,
    options: { cursor?: string; limit: number },
  ): Promise<BookingRidePage> {
    const rides = await this.prisma.ride.findMany({
      where: {riderId, state: {in: [...terminalRideStates]}},
      orderBy: [{requestedAt: "desc"}, {id: "desc"}],
      take: options.limit + 1,
      ...(options.cursor == null
        ? {}
        : {cursor: {id: options.cursor}, skip: 1}),
      include: {category: true},
    });
    const hasMore = rides.length > options.limit;
    const items = rides.slice(0, options.limit).map(toBookingRide);
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    };
  }

  async changeRideStateForRider(
    change: RiderRideStateChange,
  ): Promise<BookingRide | null> {
    return this.prisma.$transaction(async (transaction) => {
      const existingRide = await transaction.ride.findFirst({
        where: {
          id: change.rideId,
          riderId: change.riderId,
          state: change.fromState,
        },
      });
      if (existingRide == null) {
        return null;
      }

      const ride = await transaction.ride.update({
        where: { id: existingRide.id },
        data: { state: change.toState },
        include: { category: true },
      });
      await transaction.rideStateTransition.create({
        data: {
          rideId: change.rideId,
          fromState: change.fromState,
          toState: change.toState,
          actorType: "rider",
          actorId: change.riderId,
          source: "rider_app",
          occurredAt: new Date(change.occurredAt),
        },
      });
      return toBookingRide(ride);
    });
  }
}
