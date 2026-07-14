import { AuthRepository } from "./auth.repository";
import {
  ActiveCity,
  AuthenticatedRider,
  RiderProfile,
  RiderSession,
} from "./auth.types";

type City = { id: string; name?: string; active: boolean };

export class InMemoryAuthRepository extends AuthRepository {
  readonly riders: RiderProfile[] = [];
  readonly sessions: RiderSession[] = [];
  readonly deviceTokens = new Map<string, string>();

  private riderSequence = 0;
  private sessionSequence = 0;

  constructor(private readonly cities: City[]) {
    super();
  }

  async findActiveCities(): Promise<ActiveCity[]> {
    return this.cities
      .filter((city) => city.active)
      .map((city) => ({ id: city.id, name: city.name ?? city.id }));
  }

  async isCityActive(cityId: string): Promise<boolean> {
    return this.cities.some((city) => city.id === cityId && city.active);
  }

  async findRiderByPhone(phone: string): Promise<RiderProfile | null> {
    return this.riders.find((rider) => rider.phone === phone) ?? null;
  }

  async findRiderById(riderId: string): Promise<RiderProfile | null> {
    return this.riders.find((rider) => rider.id === riderId) ?? null;
  }

  async createRider(input: {
    phone: string;
    cityId: string;
  }): Promise<RiderProfile> {
    const rider: RiderProfile = {
      id: `rider_${++this.riderSequence}`,
      phone: input.phone,
      cityId: input.cityId,
      cityName: this.cityName(input.cityId),
      name: null,
      email: null,
      imageUrl: null,
    };

    this.riders.push(rider);
    return rider;
  }

  async updateRiderCity(
    riderId: string,
    cityId: string,
  ): Promise<RiderProfile> {
    const rider = this.riders.find((candidate) => candidate.id === riderId);
    if (!rider) {
      throw new Error("Rider does not exist");
    }

    rider.cityId = cityId;
    rider.cityName = this.cityName(cityId);
    return rider;
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
    const rider = this.riders.find((candidate) => candidate.id === riderId);
    if (!rider) {
      throw new Error("Rider does not exist");
    }

    rider.cityId = input.cityId;
    rider.cityName = this.cityName(input.cityId);
    rider.name = input.name;
    rider.email = input.email;
    rider.imageUrl = input.imageUrl;
    return rider;
  }

  async createSession(input: {
    riderId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<RiderSession> {
    const session: RiderSession = {
      id: `session_${++this.sessionSequence}`,
      riderId: input.riderId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      lastUsedAt: null,
    };

    this.sessions.push(session);
    return session;
  }

  async findAuthenticatedRiderByTokenHash(
    tokenHash: string,
    now: string,
  ): Promise<AuthenticatedRider | null> {
    const session = this.sessions.find(
      (candidate) =>
        candidate.tokenHash === tokenHash &&
        candidate.revokedAt === null &&
        candidate.expiresAt > now,
    );
    if (!session) {
      return null;
    }

    const rider = this.riders.find((candidate) => candidate.id === session.riderId);
    if (!rider) {
      return null;
    }

    session.lastUsedAt = now;
    return { id: rider.id, phone: rider.phone, cityId: rider.cityId };
  }

  async registerDeviceToken(riderId: string, deviceToken: string): Promise<void> {
    this.deviceTokens.set(riderId, deviceToken);
  }

  async findDeviceToken(riderId: string): Promise<string | null> {
    return this.deviceTokens.get(riderId) ?? null;
  }

  private cityName(cityId: string): string {
    const city = this.cities.find((candidate) => candidate.id === cityId);
    return city?.name ?? cityId;
  }
}
