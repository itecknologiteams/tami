import { describe, expect, it, vi } from "vitest";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("reports ok when redis responds", async () => {
    const redis = { ping: vi.fn().mockResolvedValue("PONG") };
    const controller = new HealthController(redis as never);

    await expect(controller.check()).resolves.toEqual({
      status: "ok",
      service: "tami-api",
      redis: "ok",
    });
  });

  it("reports degraded when redis is unreachable", async () => {
    const redis = { ping: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) };
    const controller = new HealthController(redis as never);

    await expect(controller.check()).resolves.toEqual({
      status: "degraded",
      service: "tami-api",
      redis: "unreachable",
    });
  });
});
