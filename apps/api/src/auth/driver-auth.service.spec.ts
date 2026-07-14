import { describe, expect, it } from "vitest";
import { DevelopmentOtpStore } from "./development-otp-store";
import { DriverAuthService } from "./driver-auth.service";
import { InMemoryDriverAuthRepository } from "./in-memory-driver-auth.repository";

describe("DriverAuthService", () => {
  it("issues a development code and exchanges it for a hashed driver session", async () => {
    const repository = new InMemoryDriverAuthRepository([
      { id: "city_karachi", name: "Karachi", active: true },
    ]);
    const service = new DriverAuthService(repository, new DevelopmentOtpStore());

    const challenge = await service.requestOtp("+923009876543");
    const result = await service.verifyDriver({
      challengeId: challenge.challengeId,
      code: challenge.developmentCode,
      cityId: "city_karachi",
    });

    expect(result.driver).toEqual({
      id: expect.any(String),
      phone: "+923009876543",
      cityId: "city_karachi",
      cityName: "Karachi",
      name: "Driver 6543",
      online: false,
    });
    expect(result.accessToken).toEqual(expect.any(String));
    expect(repository.sessions).toEqual([
      expect.objectContaining({
        driverId: result.driver.id,
        expiresAt: expect.any(String),
      }),
    ]);
    expect(repository.sessions[0]?.tokenHash).not.toBe(result.accessToken);
  });

  it("rejects verification for an inactive city", async () => {
    const repository = new InMemoryDriverAuthRepository([
      { id: "city_karachi", active: false },
    ]);
    const service = new DriverAuthService(repository, new DevelopmentOtpStore());
    const challenge = await service.requestOtp("+923009876543");

    await expect(
      service.verifyDriver({
        challengeId: challenge.challengeId,
        code: challenge.developmentCode,
        cityId: "city_karachi",
      }),
    ).rejects.toThrow("City is unavailable for driver onboarding");
  });

  it("reuses the existing driver for a known phone and moves their city", async () => {
    const repository = new InMemoryDriverAuthRepository([
      { id: "city_karachi", name: "Karachi", active: true },
      { id: "city_hyderabad", name: "Hyderabad", active: true },
    ]);
    const service = new DriverAuthService(repository, new DevelopmentOtpStore());

    const first = await service.requestOtp("+923009876543");
    const firstResult = await service.verifyDriver({
      challengeId: first.challengeId,
      code: first.developmentCode,
      cityId: "city_karachi",
    });
    const second = await service.requestOtp("+923009876543");
    const secondResult = await service.verifyDriver({
      challengeId: second.challengeId,
      code: second.developmentCode,
      cityId: "city_hyderabad",
    });

    expect(secondResult.driver.id).toBe(firstResult.driver.id);
    expect(secondResult.driver.cityId).toBe("city_hyderabad");
    expect(repository.drivers).toHaveLength(1);
  });

  it("resolves an authenticated driver from an active session token", async () => {
    const repository = new InMemoryDriverAuthRepository([
      { id: "city_karachi", active: true },
    ]);
    const service = new DriverAuthService(repository, new DevelopmentOtpStore());
    const challenge = await service.requestOtp("+923009876543");
    const result = await service.verifyDriver({
      challengeId: challenge.challengeId,
      code: challenge.developmentCode,
      cityId: "city_karachi",
    });

    const authenticated = await service.authenticate(result.accessToken);

    expect(authenticated).toEqual({
      id: result.driver.id,
      phone: "+923009876543",
      cityId: "city_karachi",
    });
  });

  it("rejects an unknown session token", async () => {
    const repository = new InMemoryDriverAuthRepository([
      { id: "city_karachi", active: true },
    ]);
    const service = new DriverAuthService(repository, new DevelopmentOtpStore());

    await expect(service.authenticate("forged-token")).rejects.toThrow(
      "Driver session is invalid or expired",
    );
  });
});
