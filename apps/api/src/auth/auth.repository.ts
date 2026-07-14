import {
  ActiveCity,
  AuthenticatedRider,
  RiderProfile,
  RiderSession,
} from "./auth.types";

export abstract class AuthRepository {
  abstract findActiveCities(): Promise<ActiveCity[]>;
  abstract isCityActive(cityId: string): Promise<boolean>;
  abstract findRiderByPhone(phone: string): Promise<RiderProfile | null>;
  abstract findRiderById(riderId: string): Promise<RiderProfile | null>;
  abstract createRider(input: {
    phone: string;
    cityId: string;
  }): Promise<RiderProfile>;
  abstract updateRiderCity(
    riderId: string,
    cityId: string,
  ): Promise<RiderProfile>;
  abstract updateRiderProfile(
    riderId: string,
    input: {
      cityId: string;
      name: string | null;
      email: string | null;
      imageUrl: string | null;
    },
  ): Promise<RiderProfile>;
  abstract createSession(input: {
    riderId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<RiderSession>;
  abstract findAuthenticatedRiderByTokenHash(
    tokenHash: string,
    now: string,
  ): Promise<AuthenticatedRider | null>;
  abstract registerDeviceToken(
    riderId: string,
    deviceToken: string,
  ): Promise<void>;
  abstract findDeviceToken(riderId: string): Promise<string | null>;
}
