import { describe, expect, it } from "vitest";
import { DriverAuthController } from "./driver-auth.controller";
import { DriverAuthService } from "./driver-auth.service";
import { createTestOtpService } from "./otp.test-fixture";
import { InMemoryDriverAuthRepository } from "./in-memory-driver-auth.repository";
import { DevelopmentOtpChallenge } from "./otp.service";

describe("DriverAuthController", () => {
  it("exposes development OTP request and driver verification", async () => {
    const controller = new DriverAuthController(
      new DriverAuthService(
        new InMemoryDriverAuthRepository([
          { id: "city_karachi", active: true },
        ]),
        createTestOtpService(),
      ),
    );

    const challenge = (await controller.requestOtp({
      phone: "+923009876543",
    })) as DevelopmentOtpChallenge;
    const result = await controller.verifyDriver({
      challengeId: challenge.challengeId,
      code: challenge.developmentCode,
      cityId: "city_karachi",
    });

    expect(result).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        driver: expect.objectContaining({ phone: "+923009876543" }),
      }),
    );
  });

  it("omits the development code in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const controller = new DriverAuthController(
        new DriverAuthService(
          new InMemoryDriverAuthRepository([
            { id: "city_karachi", active: true },
          ]),
          createTestOtpService(),
        ),
      );

      const challenge = await controller.requestOtp({ phone: "+923009876543" });

      expect(challenge).toEqual({
        challengeId: expect.any(String),
        expiresAt: expect.any(String),
      });
      expect(challenge).not.toHaveProperty("developmentCode");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
