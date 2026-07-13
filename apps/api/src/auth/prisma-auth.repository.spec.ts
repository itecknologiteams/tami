import { describe, expect, it, vi } from "vitest";
import { PrismaAuthRepository } from "./prisma-auth.repository";

describe("PrismaAuthRepository", () => {
  it("maps rider and session records to the auth domain", async () => {
    const prisma = {
      city: {
        findFirst: vi.fn().mockResolvedValue({ id: "city_karachi" }),
      },
      rider: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "rider_123",
          phone: "+923001234567",
          cityId: "city_karachi",
          city: {name: "Karachi"},
          name: null,
          email: null,
          imageUrl: null,
        }),
        update: vi.fn(),
      },
      riderSession: {
        create: vi.fn().mockResolvedValue({
          id: "session_123",
          riderId: "rider_123",
          tokenHash: "hashed-token",
          expiresAt: new Date("2026-08-09T10:00:00.000Z"),
          revokedAt: null,
          lastUsedAt: null,
        }),
      },
    };
    const repository = new PrismaAuthRepository(prisma as never);

    expect(await repository.isCityActive("city_karachi")).toBe(true);

    const rider = await repository.createRider({
      phone: "+923001234567",
      cityId: "city_karachi",
    });
    const session = await repository.createSession({
      riderId: rider.id,
      tokenHash: "hashed-token",
      expiresAt: "2026-08-09T10:00:00.000Z",
    });

    expect(prisma.rider.create).toHaveBeenCalledWith({
      data: { phone: "+923001234567", cityId: "city_karachi" },
      include: {city: {select: {name: true}}},
    });
    expect(rider.cityName).toBe("Karachi");
    expect(prisma.riderSession.create).toHaveBeenCalledWith({
      data: {
        riderId: "rider_123",
        tokenHash: "hashed-token",
        expiresAt: new Date("2026-08-09T10:00:00.000Z"),
      },
    });
    expect(session.expiresAt).toBe("2026-08-09T10:00:00.000Z");
  });
});
