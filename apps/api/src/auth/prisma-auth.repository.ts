import { Injectable } from "@nestjs/common";
import { AuthRepository } from "./auth.repository";
import {
  ActiveCity,
  AuthenticatedRider,
  RiderProfile,
  RiderSession,
} from "./auth.types";
import { PrismaService } from "../prisma/prisma.service";

function toRiderProfile(rider: {
  id: string;
  phone: string;
  cityId: string;
  name: string | null;
  email: string | null;
  imageUrl: string | null;
  city: {name: string};
}): RiderProfile {
  return {
    id: rider.id,
    phone: rider.phone,
    cityId: rider.cityId,
    cityName: rider.city.name,
    name: rider.name,
    email: rider.email,
    imageUrl: rider.imageUrl,
  };
}

@Injectable()
export class PrismaAuthRepository extends AuthRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findActiveCities(): Promise<ActiveCity[]> {
    return this.prisma.city.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async isCityActive(cityId: string): Promise<boolean> {
    const city = await this.prisma.city.findFirst({
      where: { id: cityId, active: true },
      select: { id: true },
    });

    return city !== null;
  }

  async findRiderByPhone(phone: string): Promise<RiderProfile | null> {
    const rider = await this.prisma.rider.findUnique({
      where: { phone },
      include: {city: {select: {name: true}}},
    });
    return rider ? toRiderProfile(rider) : null;
  }

  async findRiderById(riderId: string): Promise<RiderProfile | null> {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      include: {city: {select: {name: true}}},
    });
    return rider ? toRiderProfile(rider) : null;
  }

  async createRider(input: {
    phone: string;
    cityId: string;
  }): Promise<RiderProfile> {
    const rider = await this.prisma.rider.create({
      data: input,
      include: {city: {select: {name: true}}},
    });
    return toRiderProfile(rider);
  }

  async updateRiderCity(
    riderId: string,
    cityId: string,
  ): Promise<RiderProfile> {
    const rider = await this.prisma.rider.update({
      where: { id: riderId },
      data: { cityId },
      include: {city: {select: {name: true}}},
    });

    return toRiderProfile(rider);
  }

  async updateRiderProfile(
    riderId: string,
    input: {
      cityId: string;
      name: string | null;
      email: string | null;
      imageUrl: string | null;
    },
  ): Promise<RiderProfile> {
    const rider = await this.prisma.rider.update({
      where: { id: riderId },
      data: input,
      include: {city: {select: {name: true}}},
    });
    return toRiderProfile(rider);
  }

  async createSession(input: {
    riderId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<RiderSession> {
    const session = await this.prisma.riderSession.create({
      data: {
        riderId: input.riderId,
        tokenHash: input.tokenHash,
        expiresAt: new Date(input.expiresAt),
      },
    });

    return {
      id: session.id,
      riderId: session.riderId,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString() ?? null,
      lastUsedAt: session.lastUsedAt?.toISOString() ?? null,
    };
  }

  async findAuthenticatedRiderByTokenHash(
    tokenHash: string,
    now: string,
  ): Promise<AuthenticatedRider | null> {
    const nowDate = new Date(now);
    const session = await this.prisma.riderSession.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: nowDate },
      },
      include: { rider: true },
    });
    if (!session) {
      return null;
    }

    await this.prisma.riderSession.update({
      where: { id: session.id },
      data: { lastUsedAt: nowDate },
    });

    return {
      id: session.rider.id,
      phone: session.rider.phone,
      cityId: session.rider.cityId,
    };
  }

  async registerDeviceToken(riderId: string, deviceToken: string): Promise<void> {
    await this.prisma.rider.update({
      where: { id: riderId },
      data: { deviceToken },
    });
  }

  async findDeviceToken(riderId: string): Promise<string | null> {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: { deviceToken: true },
    });
    return rider?.deviceToken ?? null;
  }
}
