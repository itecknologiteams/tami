import Redis from "ioredis";

export const REDIS_CLIENT = Symbol("REDIS_CLIENT");

export function createRedisClient(): Redis {
  const url = process.env.TAMI_REDIS_URL?.trim();
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TAMI_REDIS_URL is required in production");
    }
    return new Redis("redis://127.0.0.1:6390");
  }
  return new Redis(url);
}
