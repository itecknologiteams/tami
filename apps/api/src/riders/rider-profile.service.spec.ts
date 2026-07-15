import { describe, expect, it } from "vitest";
import { AuthService } from "../auth/auth.service";
import { createTestOtpService } from "../auth/otp.test-fixture";
import { InMemoryAuthRepository } from "../auth/in-memory-auth.repository";
import { RiderProfileService } from "./rider-profile.service";

describe("RiderProfileService", () => {
  it("updates the authenticated rider profile and selected active city", async () => {
    const repository = new InMemoryAuthRepository([
      { id: "city_karachi", name: "Karachi", active: true },
      { id: "city_hyderabad", name: "Hyderabad", active: true },
    ]);
    const authService = new AuthService(repository, createTestOtpService());
    const challenge = await authService.requestOtp("+923001234567");
    const session = await authService.verifyRider({
      challengeId: challenge.challengeId,
      code: challenge.developmentCode,
      cityId: "city_karachi",
    });
    const service = new RiderProfileService(repository);

    const profile = await service.updateProfile(session.rider.id, {
      cityId: "city_hyderabad",
      name: "Aamir",
      email: "aamir@example.com",
      imageUrl: "https://images.example/rider.jpg",
    });

    expect(profile).toEqual({
      id: session.rider.id,
      phone: "+923001234567",
      cityId: "city_hyderabad",
      cityName: "Hyderabad",
      name: "Aamir",
      email: "aamir@example.com",
      imageUrl: "https://images.example/rider.jpg",
    });
  });
});
