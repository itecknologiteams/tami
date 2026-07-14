import {
  AuthenticatedDriver,
  DriverProfile,
  DriverSession,
} from "./driver-auth.types";

export abstract class DriverAuthRepository {
  abstract isCityActive(cityId: string): Promise<boolean>;
  abstract findDriverByPhone(phone: string): Promise<DriverProfile | null>;
  abstract createDriver(input: {
    phone: string;
    cityId: string;
    name: string;
  }): Promise<DriverProfile>;
  abstract updateDriverCity(
    driverId: string,
    cityId: string,
  ): Promise<DriverProfile>;
  abstract createSession(input: {
    driverId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<DriverSession>;
  abstract findAuthenticatedDriverByTokenHash(
    tokenHash: string,
    now: string,
  ): Promise<AuthenticatedDriver | null>;
  abstract registerDeviceToken(
    driverId: string,
    deviceToken: string,
  ): Promise<void>;
  abstract findDeviceToken(driverId: string): Promise<string | null>;
}
