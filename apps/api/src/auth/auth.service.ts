import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { AuthRepository } from "./auth.repository";
import {
  ActiveCity,
  AuthenticatedRider,
  RiderProfile,
  VerifyRiderRequest,
  VerifyRiderResult,
} from "./auth.types";
import { DevelopmentOtpChallenge, OtpService } from "./otp.service";

const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly otpStore: OtpService,
  ) {}

  async requestOtp(phone: string): Promise<DevelopmentOtpChallenge> {
    this.otpStore.assertPhone(phone);
    return this.otpStore.issue(phone);
  }

  getActiveCities(): Promise<ActiveCity[]> {
    return this.repository.findActiveCities();
  }

  async verifyRider(request: VerifyRiderRequest): Promise<VerifyRiderResult> {
    const cityIsActive = await this.repository.isCityActive(request.cityId);
    if (!cityIsActive) {
      throw new NotFoundException("City is unavailable for rider onboarding");
    }

    const phone = this.otpStore.consume(request.challengeId, request.code);
    const existingRider = await this.repository.findRiderByPhone(phone);
    const rider = existingRider
      ? await this.repository.updateRiderCity(existingRider.id, request.cityId)
      : await this.repository.createRider({ phone, cityId: request.cityId });

    const accessToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + sessionLifetimeMs).toISOString();

    await this.repository.createSession({
      riderId: rider.id,
      tokenHash: hashSessionToken(accessToken),
      expiresAt,
    });

    return { accessToken, rider: this.toProfile(rider) };
  }

  async authenticate(accessToken: string): Promise<AuthenticatedRider> {
    const rider = await this.repository.findAuthenticatedRiderByTokenHash(
      hashSessionToken(accessToken),
      new Date().toISOString(),
    );
    if (!rider) {
      throw new UnauthorizedException("Rider session is invalid or expired");
    }

    return rider;
  }

  async registerDeviceToken(riderId: string, deviceToken: string): Promise<void> {
    const trimmedToken = deviceToken.trim();
    if (trimmedToken.length === 0) {
      throw new BadRequestException("Device token is required");
    }
    await this.repository.registerDeviceToken(riderId, trimmedToken);
  }

  private toProfile(rider: RiderProfile): RiderProfile {
    return { ...rider };
  }
}
