import { describe, expect, it } from "vitest";
import { AuthService } from "../auth/auth.service";
import { createTestOtpService } from "../auth/otp.test-fixture";
import { InMemoryAuthRepository } from "../auth/in-memory-auth.repository";
import { RiderProfileController } from "./rider-profile.controller";
import { RiderProfileService } from "./rider-profile.service";

describe("RiderProfileController", () => {
  it("reads and updates the authenticated rider profile", async () => {
    const repository = new InMemoryAuthRepository([
      { id: "city_karachi", active: true },
    ]);
    const authService = new AuthService(repository, createTestOtpService());
    const challenge = await authService.requestOtp("+923001234567");
    const session = await authService.verifyRider({
      challengeId: challenge.challengeId,
      code: challenge.developmentCode,
      cityId: "city_karachi",
    });
    const controller = new RiderProfileController(
      new RiderProfileService(repository),
    );
    const rider = {
      id: session.rider.id,
      phone: session.rider.phone,
      cityId: session.rider.cityId,
    };

    await expect(controller.getMe(rider)).resolves.toEqual(session.rider);
    await expect(
      controller.updateMe(rider, {
        cityId: "city_karachi",
        name: "Aamir",
      }),
    ).resolves.toEqual(expect.objectContaining({ name: "Aamir" }));
  });
});
