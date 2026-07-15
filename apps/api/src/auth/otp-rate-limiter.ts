import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../redis/redis-client.provider";

const windowSeconds = 10 * 60;
const maxRequestsPerWindow = 3;

@Injectable()
export class OtpRateLimiter {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async assertNotRateLimited(phone: string): Promise<void> {
    const key = `otp-rate-limit:${phone}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }

    if (count > maxRequestsPerWindow) {
      const retryAfterSeconds = await this.redis.ttl(key);
      throw new HttpException(
        {
          message: "Too many OTP requests for this phone number",
          retryAfterSeconds: retryAfterSeconds > 0 ? retryAfterSeconds : windowSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
