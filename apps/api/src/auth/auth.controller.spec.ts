import { describe, expect, it } from "vitest";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { createTestOtpService } from "./otp.test-fixture";
import { InMemoryAuthRepository } from "./in-memory-auth.repository";
import { DevelopmentOtpChallenge, OtpService } from "./otp.service";

describe("AuthController", () => {
  it("exposes development OTP request and rider verification", async () => {
    const controller = new AuthController(
      new AuthService(
        new InMemoryAuthRepository([{ id: "city_karachi", active: true }]),
        createTestOtpService(),
      ),
    );

    await expect(controller.getActiveCities()).resolves.toEqual([
      { id: "city_karachi", name: "city_karachi" },
    ]);

    const challenge = (await controller.requestOtp({
      phone: "+923001234567",
    })) as DevelopmentOtpChallenge;
    const result = await controller.verifyRider({
      challengeId: challenge.challengeId,
      code: challenge.developmentCode,
      cityId: "city_karachi",
    });

    expect(result).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        rider: expect.objectContaining({ phone: "+923001234567" }),
      }),
    );
  });

  it("omits the development code in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const controller = new AuthController(
        new AuthService(
          new InMemoryAuthRepository([{ id: "city_karachi", active: true }]),
          createTestOtpService(),
        ),
      );

      const challenge = await controller.requestOtp({ phone: "+923001234567" });

      expect(challenge).toEqual({
        challengeId: expect.any(String),
        expiresAt: expect.any(String),
      });
      expect(challenge).not.toHaveProperty("developmentCode");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("surfaces sms delivery failure as an error", async () => {
    const failingSmsService = new AuthService(
      new InMemoryAuthRepository([{ id: "city_karachi", active: true }]),
      new OtpService(
        { send: async () => { throw new Error("SMS delivery is unavailable"); } },
        { assertNotRateLimited: async () => undefined } as never,
      ),
    );
    const controller = new AuthController(failingSmsService);

    await expect(
      controller.requestOtp({ phone: "+923001234567" }),
    ).rejects.toThrow("SMS delivery is unavailable");
  });
});
