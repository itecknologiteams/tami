import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DriverAuthRepository } from "./driver-auth.repository";
import {
  AuthenticatedDriver,
  DriverProfile,
  DriverSession,
} from "./driver-auth.types";

function toDriverProfile(driver: {
  id: string;
  phone: string;
  cityId: string;
  name: string;
  online: boolean;
  city: {name: string};
}): DriverProfile {
  return {
    id: driver.id,
    phone: driver.phone,
    cityId: driver.cityId,
    cityName: driver.city.name,
    name: driver.name,
    online: driver.online,
  };
}

@Injectable()
export class PrismaDriverAuthRepository extends DriverAuthRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isCityActive(cityId: string): Promise<boolean> {
    const city = await this.prisma.city.findFirst({
      where: { id: cityId, active: true },
      select: { id: true },
    });

    return city !== null;
  }

  async findDriverByPhone(phone: string): Promise<DriverProfile | null> {
    const driver = await this.prisma.driver.findUnique({
      where: { phone },
      include: {city: {select: {name: true}}},
    });
    return driver ? toDriverProfile(driver) : null;
  }

  async createDriver(input: {
    phone: string;
    cityId: string;
    name: string;
  }): Promise<DriverProfile> {
    const driver = await this.prisma.driver.create({
      data: input,
      include: {city: {select: {name: true}}},
    });
    return toDriverProfile(driver);
  }

  async updateDriverCity(
    driverId: string,
    cityId: string,
  ): Promise<DriverProfile> {
    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: { cityId },
      include: {city: {select: {name: true}}},
    });

    return toDriverProfile(driver);
  }

  async createSession(input: {
    driverId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<DriverSession> {
    const session = await this.prisma.driverSession.create({
      data: {
        driverId: input.driverId,
        tokenHash: input.tokenHash,
        expiresAt: new Date(input.expiresAt),
      },
    });

    return {
      id: session.id,
      driverId: session.driverId,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString() ?? null,
      lastUsedAt: session.lastUsedAt?.toISOString() ?? null,
    };
  }

  async findAuthenticatedDriverByTokenHash(
    tokenHash: string,
    now: string,
  ): Promise<AuthenticatedDriver | null> {
    const nowDate = new Date(now);
    const session = await this.prisma.driverSession.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: nowDate },
      },
      include: { driver: true },
    });
    if (!session) {
      return null;
    }

    await this.prisma.driverSession.update({
      where: { id: session.id },
      data: { lastUsedAt: nowDate },
    });

    return {
      id: session.driver.id,
      phone: session.driver.phone,
      cityId: session.driver.cityId,
    };
  }
}
