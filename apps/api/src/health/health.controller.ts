import { Controller, Get, Inject } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../redis/redis-client.provider";

@Controller("health")
export class HealthController {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  @Get()
  async check() {
    const redisStatus = await this.checkRedis();
    return {
      status: redisStatus === "ok" ? "ok" : "degraded",
      service: "tami-api",
      redis: redisStatus,
    };
  }

  private async checkRedis(): Promise<"ok" | "unreachable"> {
    try {
      await this.redis.ping();
      return "ok";
    } catch {
      return "unreachable";
    }
  }
}
