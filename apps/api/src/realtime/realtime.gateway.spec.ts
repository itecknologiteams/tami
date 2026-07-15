import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AuthService } from "../auth/auth.service";
import { createTestOtpService } from "../auth/otp.test-fixture";
import { DriverAuthService } from "../auth/driver-auth.service";
import { InMemoryAuthRepository } from "../auth/in-memory-auth.repository";
import { InMemoryDriverAuthRepository } from "../auth/in-memory-driver-auth.repository";
import {
  driverRoom,
  extractHandshakeToken,
  RealtimeAuthHandshake,
  riderRoom,
} from "./realtime.gateway";

async function createRiderSession() {
  const repository = new InMemoryAuthRepository([
    {id: "city_karachi", name: "Karachi", active: true},
  ]);
  const authService = new AuthService(repository, createTestOtpService());
  const challenge = await authService.requestOtp("+923001234567");
  const result = await authService.verifyRider({
    challengeId: challenge.challengeId,
    code: challenge.developmentCode,
    cityId: "city_karachi",
  });
  return {authService, accessToken: result.accessToken, riderId: result.rider.id};
}

async function createDriverSession() {
  const repository = new InMemoryDriverAuthRepository([
    {id: "city_karachi", name: "Karachi", active: true},
  ]);
  const driverAuthService = new DriverAuthService(
    repository,
    createTestOtpService(),
  );
  const challenge = await driverAuthService.requestOtp("+923009876543");
  const result = await driverAuthService.verifyDriver({
    challengeId: challenge.challengeId,
    code: challenge.developmentCode,
    cityId: "city_karachi",
  });
  return {
    driverAuthService,
    accessToken: result.accessToken,
    driverId: result.driver.id,
  };
}

describe("extractHandshakeToken", () => {
  it("reads the token from handshake.auth.token", () => {
    const token = extractHandshakeToken({
      handshake: {auth: {token: "abc123"}},
    });
    expect(token).toBe("abc123");
  });

  it("falls back to a query string token", () => {
    const token = extractHandshakeToken({
      handshake: {auth: {}, query: {token: "query-token"}},
    });
    expect(token).toBe("query-token");
  });

  it("returns null when no token is present", () => {
    const token = extractHandshakeToken({handshake: {auth: {}}});
    expect(token).toBeNull();
  });
});

describe("RealtimeAuthHandshake", () => {
  it("authenticates a rider and returns their room", async () => {
    const {authService, accessToken, riderId} = await createRiderSession();
    const handshake = new RealtimeAuthHandshake(
      authService,
      new DriverAuthService(
        new InMemoryDriverAuthRepository([]),
        createTestOtpService(),
      ),
    );

    const result = await handshake.authenticateRider({
      handshake: {auth: {token: accessToken}},
    });

    expect(result).toEqual({riderId, room: riderRoom(riderId)});
  });

  it("rejects a rider connection with no token", async () => {
    const {authService} = await createRiderSession();
    const handshake = new RealtimeAuthHandshake(
      authService,
      new DriverAuthService(
        new InMemoryDriverAuthRepository([]),
        createTestOtpService(),
      ),
    );

    await expect(
      handshake.authenticateRider({handshake: {auth: {}}}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a rider connection with an invalid token", async () => {
    const {authService} = await createRiderSession();
    const handshake = new RealtimeAuthHandshake(
      authService,
      new DriverAuthService(
        new InMemoryDriverAuthRepository([]),
        createTestOtpService(),
      ),
    );

    await expect(
      handshake.authenticateRider({handshake: {auth: {token: "forged"}}}),
    ).rejects.toThrow("Rider session is invalid or expired");
  });

  it("authenticates a driver and returns their room", async () => {
    const {driverAuthService, accessToken, driverId} =
      await createDriverSession();
    const handshake = new RealtimeAuthHandshake(
      new AuthService(new InMemoryAuthRepository([]), createTestOtpService()),
      driverAuthService,
    );

    const result = await handshake.authenticateDriver({
      handshake: {auth: {token: accessToken}},
    });

    expect(result).toEqual({driverId, room: driverRoom(driverId)});
  });

  it("rejects a driver connection with no token", async () => {
    const {driverAuthService} = await createDriverSession();
    const handshake = new RealtimeAuthHandshake(
      new AuthService(new InMemoryAuthRepository([]), createTestOtpService()),
      driverAuthService,
    );

    await expect(
      handshake.authenticateDriver({handshake: {auth: {}}}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a driver connection with an invalid token", async () => {
    const {driverAuthService} = await createDriverSession();
    const handshake = new RealtimeAuthHandshake(
      new AuthService(new InMemoryAuthRepository([]), createTestOtpService()),
      driverAuthService,
    );

    await expect(
      handshake.authenticateDriver({handshake: {auth: {token: "forged"}}}),
    ).rejects.toThrow("Driver session is invalid or expired");
  });
});
