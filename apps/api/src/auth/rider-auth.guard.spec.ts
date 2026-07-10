import { describe, expect, it } from "vitest";
import { AuthService } from "./auth.service";
import { DevelopmentOtpStore } from "./development-otp-store";
import { InMemoryAuthRepository } from "./in-memory-auth.repository";
import { RiderAuthGuard } from "./rider-auth.guard";

describe("RiderAuthGuard", () => {
  it("attaches the rider resolved from a bearer token", async () => {
    const repository = new InMemoryAuthRepository([
      { id: "city_karachi", active: true },
    ]);
    const authService = new AuthService(repository, new DevelopmentOtpStore());
    const challenge = await authService.requestOtp("+923001234567");
    const session = await authService.verifyRider({
      challengeId: challenge.challengeId,
      code: challenge.developmentCode,
      cityId: "city_karachi",
    });
    const request = {
      headers: { authorization: `Bearer ${session.accessToken}` },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    };

    await expect(
      new RiderAuthGuard(authService).canActivate(context as never),
    ).resolves.toBe(true);
    expect(request).toEqual(
      expect.objectContaining({
        rider: {
          id: session.rider.id,
          cityId: "city_karachi",
          phone: "+923001234567",
        },
      }),
    );
  });
});
