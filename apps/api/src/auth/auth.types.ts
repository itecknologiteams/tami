export type RiderProfile = {
  id: string;
  phone: string;
  cityId: string;
  cityName: string;
  name: string | null;
  email: string | null;
  imageUrl: string | null;
};

export type ActiveCity = {
  id: string;
  name: string;
};

export type AuthenticatedRider = Pick<RiderProfile, "id" | "phone" | "cityId">;

export type RiderSession = {
  id: string;
  riderId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

export type VerifyRiderRequest = {
  challengeId: string;
  code: string;
  cityId: string;
};

export type VerifyRiderResult = {
  accessToken: string;
  rider: RiderProfile;
};
