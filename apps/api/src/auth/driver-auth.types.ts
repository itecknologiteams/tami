export type DriverProfile = {
  id: string;
  phone: string;
  cityId: string;
  cityName: string;
  name: string;
  online: boolean;
};

export type AuthenticatedDriver = Pick<
  DriverProfile,
  "id" | "phone" | "cityId"
>;

export type DriverSession = {
  id: string;
  driverId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

export type VerifyDriverRequest = {
  challengeId: string;
  code: string;
  cityId: string;
};

export type VerifyDriverResult = {
  accessToken: string;
  driver: DriverProfile;
};
