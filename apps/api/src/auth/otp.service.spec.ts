import { describe, expect, it, vi } from "vitest";
import { OtpService } from "./otp.service";
import { OtpRateLimiter } from "./otp-rate-limiter";
import { SmsProvider } from "../sms/sms.provider";

class FakeSmsProvider extends SmsProvider {
  readonly sent: Array<{phone: string; body: string}> = [];
  async send(phone: string, body: string): Promise<void> {
    this.sent.push({phone, body});
  }
}

function fixture() {
  const smsProvider = new FakeSmsProvider();
  const rateLimiter = {
    assertNotRateLimited: vi.fn().mockResolvedValue(undefined),
  } as unknown as OtpRateLimiter;
  const service = new OtpService(smsProvider, rateLimiter);
  return {smsProvider, rateLimiter, service};
}

describe("OtpService", () => {
  it("sends the code by sms and checks the rate limiter", async () => {
    const {smsProvider, rateLimiter, service} = fixture();

    const challenge = await service.issue("+923001234567");

    expect(rateLimiter.assertNotRateLimited).toHaveBeenCalledWith(
      "+923001234567",
    );
    expect(smsProvider.sent).toEqual([
      {
        phone: "+923001234567",
        body: expect.stringContaining(challenge.developmentCode),
      },
    ]);
  });

  it("propagates a rate limit rejection before sending sms", async () => {
    const {smsProvider, rateLimiter, service} = fixture();
    vi.mocked(rateLimiter.assertNotRateLimited).mockRejectedValue(
      new Error("Too many OTP requests for this phone number"),
    );

    await expect(service.issue("+923001234567")).rejects.toThrow(
      "Too many OTP requests for this phone number",
    );
    expect(smsProvider.sent).toEqual([]);
  });

  it("propagates an sms delivery failure", async () => {
    const {rateLimiter} = fixture();
    const failingSms: SmsProvider = {
      send: vi.fn().mockRejectedValue(new Error("SMS delivery is unavailable")),
    };
    const service = new OtpService(failingSms, rateLimiter);

    await expect(service.issue("+923001234567")).rejects.toThrow(
      "SMS delivery is unavailable",
    );
  });

  it("still consumes a valid challenge exactly once", async () => {
    const {service} = fixture();
    const challenge = await service.issue("+923001234567");

    expect(service.consume(challenge.challengeId, challenge.developmentCode)).toBe(
      "+923001234567",
    );
    expect(() =>
      service.consume(challenge.challengeId, challenge.developmentCode),
    ).toThrow("OTP challenge is invalid or already used");
  });
});
