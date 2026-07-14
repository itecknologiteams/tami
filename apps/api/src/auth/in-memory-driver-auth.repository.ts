import { DriverAuthRepository } from "./driver-auth.repository";
import {
  AuthenticatedDriver,
  DriverProfile,
  DriverSession,
} from "./driver-auth.types";

type City = { id: string; name?: string; active: boolean };

export class InMemoryDriverAuthRepository extends DriverAuthRepository {
  readonly drivers: DriverProfile[] = [];
  readonly sessions: DriverSession[] = [];

  private driverSequence = 0;
  private sessionSequence = 0;

  constructor(private readonly cities: City[]) {
    super();
  }

  async isCityActive(cityId: string): Promise<boolean> {
    return this.cities.some((city) => city.id === cityId && city.active);
  }

  async findDriverByPhone(phone: string): Promise<DriverProfile | null> {
    return this.drivers.find((driver) => driver.phone === phone) ?? null;
  }

  async createDriver(input: {
    phone: string;
    cityId: string;
    name: string;
  }): Promise<DriverProfile> {
    const driver: DriverProfile = {
      id: `driver_${++this.driverSequence}`,
      phone: input.phone,
      cityId: input.cityId,
      cityName: this.cityName(input.cityId),
      name: input.name,
      online: false,
    };

    this.drivers.push(driver);
    return driver;
  }

  async updateDriverCity(
    driverId: string,
    cityId: string,
  ): Promise<DriverProfile> {
    const driver = this.drivers.find((candidate) => candidate.id === driverId);
    if (!driver) {
      throw new Error("Driver does not exist");
    }

    driver.cityId = cityId;
    driver.cityName = this.cityName(cityId);
    return driver;
  }

  async createSession(input: {
    driverId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<DriverSession> {
    const session: DriverSession = {
      id: `driver_session_${++this.sessionSequence}`,
      driverId: input.driverId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      lastUsedAt: null,
    };

    this.sessions.push(session);
    return session;
  }

  async findAuthenticatedDriverByTokenHash(
    tokenHash: string,
    now: string,
  ): Promise<AuthenticatedDriver | null> {
    const session = this.sessions.find(
      (candidate) =>
        candidate.tokenHash === tokenHash &&
        candidate.revokedAt === null &&
        candidate.expiresAt > now,
    );
    if (!session) {
      return null;
    }

    const driver = this.drivers.find(
      (candidate) => candidate.id === session.driverId,
    );
    if (!driver) {
      return null;
    }

    session.lastUsedAt = now;
    return { id: driver.id, phone: driver.phone, cityId: driver.cityId };
  }

  private cityName(cityId: string): string {
    const city = this.cities.find((candidate) => candidate.id === cityId);
    return city?.name ?? cityId;
  }
}
