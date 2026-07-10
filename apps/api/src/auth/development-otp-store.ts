import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { randomInt, randomUUID } from "node:crypto";

type OtpChallenge = {
  phone: string;
  code: string;
  expiresAt: Date;
};

export type DevelopmentOtpChallenge = {
  challengeId: string;
  developmentCode: string;
  expiresAt: string;
};

@Injectable()
export class DevelopmentOtpStore {
  private readonly challenges = new Map<string, OtpChallenge>();

  issue(phone: string): DevelopmentOtpChallenge {
    const challengeId = `challenge_${randomUUID()}`;
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    this.challenges.set(challengeId, { phone, code, expiresAt });

    return {
      challengeId,
      developmentCode: code,
      expiresAt: expiresAt.toISOString(),
    };
  }

  consume(challengeId: string, code: string): string {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new UnauthorizedException("OTP challenge is invalid or already used");
    }

    this.challenges.delete(challengeId);

    if (challenge.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("OTP challenge has expired");
    }

    if (challenge.code !== code) {
      throw new UnauthorizedException("OTP code is invalid");
    }

    return challenge.phone;
  }

  assertPhone(phone: string) {
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      throw new BadRequestException("Phone number must use international format");
    }
  }
}
