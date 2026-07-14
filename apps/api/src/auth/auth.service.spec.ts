import { describe, expect, it } from "vitest";
import { AuthService } from "./auth.service";
import { DevelopmentOtpStore } from "./development-otp-store";
import { InMemoryAuthRepository } from "./in-memory-auth.repository";

describe("AuthService", () => {
  it("issues a development code and exchanges it for a hashed rider session", async () => {
    const repository = new InMemoryAuthRepository([
      { id: "city_karachi", name: "Karachi", active: true },
    ]);
    const service = new AuthService(repository, new DevelopmentOtpStore());

    const challenge = await service.requestOtp("+923001234567");
    const result = await service.verifyRider({
      challengeId: challenge.challengeId,
      code: challenge.developmentCode,
      cityId: "city_karachi",
    });

    expect(result.rider).toEqual({
      id: expect.any(String),
      phone: "+923001234567",
      cityId: "city_karachi",
      cityName: "Karachi",
      name: null,
      email: null,
      imageUrl: null,
    });
    expect(result.accessToken).toEqual(expect.any(String));
    expect(repository.sessions).toEqual([
      expect.objectContaining({
        riderId: result.rider.id,
        expiresAt: expect.any(String),
      }),
    ]);
    expect(repository.sessions[0]?.tokenHash).not.toBe(result.accessToken);
  });

  it("rejects verification for an inactive city", async () => {
    const repository = new InMemoryAuthRepository([
      { id: "city_karachi", active: false },
    ]);
    const service = new AuthService(repository, new DevelopmentOtpStore());
    const challenge = await service.requestOtp("+923001234567");

    await expect(
      service.verifyRider({
        challengeId: challenge.challengeId,
        code: challenge.developmentCode,
        cityId: "city_karachi",
      }),
    ).rejects.toThrow("City is unavailable for rider onboarding");
  });

  it("resolves an authenticated rider from an active session token", async () => {
    const repository = new InMemoryAuthRepository([
      { id: "city_karachi", active: true },
    ]);
    const service = new AuthService(repository, new DevelopmentOtpStore());
    const challenge = await service.requestOtp("+923001234567");
    const session = await service.verifyRider({
      challengeId: challenge.challengeId,
      code: challenge.developmentCode,
      cityId: "city_karachi",
    });

    await expect(service.authenticate(session.accessToken)).resolves.toEqual({
      id: session.rider.id,
      phone: "+923001234567",
      cityId: "city_karachi",
    });
  });

  it("registers a device token for a rider", async () => {
    const repository = new InMemoryAuthRepository([
      { id: "city_karachi", active: true },
    ]);
    const service = new AuthService(repository, new DevelopmentOtpStore());
    const challenge = await service.requestOtp("+923001234567");
    const session = await service.verifyRider({
      challengeId: challenge.challengeId,
      code: challenge.developmentCode,
      cityId: "city_karachi",
    });

    await service.registerDeviceToken(session.rider.id, "device-token-123");

    await expect(repository.findDeviceToken(session.rider.id)).resolves.toBe(
      "device-token-123",
    );
  });

  it("rejects an empty device token", async () => {
    const repository = new InMemoryAuthRepository([
      { id: "city_karachi", active: true },
    ]);
    const service = new AuthService(repository, new DevelopmentOtpStore());

    await expect(
      service.registerDeviceToken("rider_1", "   "),
    ).rejects.toThrow("Device token is required");
  });
});
