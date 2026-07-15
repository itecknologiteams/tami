import { describe, expect, it } from "vitest";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { createTestOtpService } from "./otp.test-fixture";
import { InMemoryAuthRepository } from "./in-memory-auth.repository";

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

    const challenge = await controller.requestOtp({
      phone: "+923001234567",
    });
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
});
