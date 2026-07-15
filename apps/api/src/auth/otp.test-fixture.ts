import { OtpRateLimiter } from "./otp-rate-limiter";
import { OtpService } from "./otp.service";
import { SmsProvider } from "../sms/sms.provider";

class NoopSmsProvider extends SmsProvider {
  async send(): Promise<void> {}
}

function noopRateLimiter(): OtpRateLimiter {
  return { assertNotRateLimited: async () => undefined } as unknown as OtpRateLimiter;
}

/**
 * Builds an OtpService with a no-op SMS provider and no-op rate limiter,
 * for specs whose subject is not OTP delivery itself (auth guard tests,
 * rider/driver profile tests, realtime gateway tests, etc.).
 */
export function createTestOtpService(): OtpService {
  return new OtpService(new NoopSmsProvider(), noopRateLimiter());
}
