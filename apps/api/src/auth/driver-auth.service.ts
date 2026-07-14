import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { hashSessionToken } from "./auth.service";
import {
  DevelopmentOtpChallenge,
  DevelopmentOtpStore,
} from "./development-otp-store";
import { DriverAuthRepository } from "./driver-auth.repository";
import {
  AuthenticatedDriver,
  VerifyDriverRequest,
  VerifyDriverResult,
} from "./driver-auth.types";

const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class DriverAuthService {
  constructor(
    private readonly repository: DriverAuthRepository,
    private readonly otpStore: DevelopmentOtpStore,
  ) {}

  async requestOtp(phone: string): Promise<DevelopmentOtpChallenge> {
    this.otpStore.assertPhone(phone);
    return this.otpStore.issue(phone);
  }

  async verifyDriver(
    request: VerifyDriverRequest,
  ): Promise<VerifyDriverResult> {
    const cityIsActive = await this.repository.isCityActive(request.cityId);
    if (!cityIsActive) {
      throw new NotFoundException("City is unavailable for driver onboarding");
    }

    const phone = this.otpStore.consume(request.challengeId, request.code);
    const existingDriver = await this.repository.findDriverByPhone(phone);
    const driver = existingDriver
      ? await this.repository.updateDriverCity(existingDriver.id, request.cityId)
      : await this.repository.createDriver({
          phone,
          cityId: request.cityId,
          name: `Driver ${phone.slice(-4)}`,
        });

    const accessToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + sessionLifetimeMs).toISOString();

    await this.repository.createSession({
      driverId: driver.id,
      tokenHash: hashSessionToken(accessToken),
      expiresAt,
    });

    return { accessToken, driver };
  }

  async authenticate(accessToken: string): Promise<AuthenticatedDriver> {
    const driver = await this.repository.findAuthenticatedDriverByTokenHash(
      hashSessionToken(accessToken),
      new Date().toISOString(),
    );
    if (!driver) {
      throw new UnauthorizedException("Driver session is invalid or expired");
    }

    return driver;
  }
}
