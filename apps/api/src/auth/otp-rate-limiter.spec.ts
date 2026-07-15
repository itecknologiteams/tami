import { describe, expect, it } from "vitest";
import { OtpRateLimiter } from "./otp-rate-limiter";

class FakeRedis {
  private readonly counts = new Map<string, number>();
  private readonly expiries = new Map<string, number>();

  async incr(key: string): Promise<number> {
    const next = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, next);
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.expiries.set(key, seconds);
    return 1;
  }

  async ttl(key: string): Promise<number> {
    return this.expiries.get(key) ?? -1;
  }
}

describe("OtpRateLimiter", () => {
  it("allows up to 3 requests per phone in the window", async () => {
    const limiter = new OtpRateLimiter(new FakeRedis() as never);

    await limiter.assertNotRateLimited("+923001234567");
    await limiter.assertNotRateLimited("+923001234567");
    await limiter.assertNotRateLimited("+923001234567");
  });

  it("rejects the 4th request in the window with a retry hint", async () => {
    const limiter = new OtpRateLimiter(new FakeRedis() as never);

    await limiter.assertNotRateLimited("+923001234567");
    await limiter.assertNotRateLimited("+923001234567");
    await limiter.assertNotRateLimited("+923001234567");

    await expect(
      limiter.assertNotRateLimited("+923001234567"),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        retryAfterSeconds: expect.any(Number),
      }),
    });
  });

  it("tracks phones independently", async () => {
    const limiter = new OtpRateLimiter(new FakeRedis() as never);

    await limiter.assertNotRateLimited("+923001234567");
    await limiter.assertNotRateLimited("+923001234567");
    await limiter.assertNotRateLimited("+923001234567");

    await limiter.assertNotRateLimited("+923009876543");
  });
});
