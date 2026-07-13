import { describe, expect, it, vi } from "vitest";
import { PrismaSavedPlacesRepository } from "./prisma-saved-places.repository";

function createDecimal(value: number) {
  return {
    toNumber() {
      return value;
    },
  };
}

function createPrismaFake() {
  const persistedPlace = {
    id: "place_123",
    riderId: "rider_123",
    cityId: "city_karachi",
    designation: "home",
    label: "Home",
    address: "Main Street",
    latitude: createDecimal(24.8607),
    longitude: createDecimal(67.0011),
    createdAt: new Date("2026-07-13T10:00:00.000Z"),
    updatedAt: new Date("2026-07-13T10:00:00.000Z"),
  };

  const transactionClient = {
    savedPlace: {
      create: vi.fn().mockResolvedValue(persistedPlace),
      upsert: vi.fn().mockResolvedValue(persistedPlace),
      findFirst: vi.fn().mockResolvedValue(persistedPlace),
      findMany: vi.fn().mockResolvedValue([persistedPlace]),
      update: vi.fn().mockResolvedValue(persistedPlace),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };

  return {
    ...transactionClient,
    $transaction: vi.fn(
      async (
        callback: (client: typeof transactionClient) => Promise<unknown>,
      ) => callback(transactionClient),
    ),
  };
}

describe("PrismaSavedPlacesRepository", () => {
  it("filters listed places by rider ownership", async () => {
    const prisma = createPrismaFake();
    const repository = new PrismaSavedPlacesRepository(prisma as never);

    await repository.listPlacesForRider("rider_123");

    expect(prisma.savedPlace.findMany).toHaveBeenCalledWith({
      where: { riderId: "rider_123" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  });

  it("upserts designated places by rider and designation atomically", async () => {
    const prisma = createPrismaFake();
    const repository = new PrismaSavedPlacesRepository(prisma as never);

    const place = await repository.savePlaceForRider({
      riderId: "rider_123",
      cityId: "city_karachi",
      designation: "home",
      label: "Home",
      address: "Main Street",
      latitude: 24.8607,
      longitude: 67.0011,
      timestamp: "2026-07-13T10:00:00.000Z",
    });

    expect(prisma.savedPlace.upsert).toHaveBeenCalledWith({
      where: {
        riderId_designation: {
          riderId: "rider_123",
          designation: "home",
        },
      },
      update: {
        cityId: "city_karachi",
        label: "Home",
        address: "Main Street",
        latitude: 24.8607,
        longitude: 67.0011,
        updatedAt: new Date("2026-07-13T10:00:00.000Z"),
      },
      create: {
        riderId: "rider_123",
        cityId: "city_karachi",
        designation: "home",
        label: "Home",
        address: "Main Street",
        latitude: 24.8607,
        longitude: 67.0011,
        createdAt: new Date("2026-07-13T10:00:00.000Z"),
        updatedAt: new Date("2026-07-13T10:00:00.000Z"),
      },
    });
    expect(place).toEqual(
      expect.objectContaining({
        id: "place_123",
        riderId: "rider_123",
        designation: "home",
      }),
    );
  });

  it("returns null when updating a place outside the rider ownership filter", async () => {
    const prisma = createPrismaFake();
    prisma.savedPlace.findFirst.mockResolvedValueOnce(null);
    const repository = new PrismaSavedPlacesRepository(prisma as never);

    await expect(
      repository.savePlaceForRider({
        placeId: "place_404",
        riderId: "rider_123",
        cityId: "city_karachi",
        designation: null,
        label: "Office",
        address: "Office Road",
        latitude: 24.8711,
        longitude: 67.0211,
        timestamp: "2026-07-13T10:00:00.000Z",
      }),
    ).resolves.toBeNull();

    expect(prisma.savedPlace.findFirst).toHaveBeenCalledWith({
      where: {
        id: "place_404",
        riderId: "rider_123",
      },
    });
  });

  it.each(["home", "work"] as const)(
    "replaces a conflicting %s place during the transactional update path",
    async (designation) => {
      const prisma = createPrismaFake();
      prisma.savedPlace.findFirst
        .mockResolvedValueOnce({
          id: "place_123",
          riderId: "rider_123",
          cityId: "city_karachi",
          designation: null,
          label: "Cafe",
          address: "Coffee Street",
          latitude: createDecimal(24.8607),
          longitude: createDecimal(67.0011),
          createdAt: new Date("2026-07-13T09:00:00.000Z"),
          updatedAt: new Date("2026-07-13T09:00:00.000Z"),
        })
        .mockResolvedValueOnce({
          id: "place_conflict",
          riderId: "rider_123",
          cityId: "city_karachi",
          designation,
          label: designation === "home" ? "Old Home" : "Old Office",
          address: designation === "home" ? "Old Home Road" : "Old Office Road",
          latitude: createDecimal(24.861),
          longitude: createDecimal(67.002),
          createdAt: new Date("2026-07-13T08:00:00.000Z"),
          updatedAt: new Date("2026-07-13T08:00:00.000Z"),
        });
      prisma.savedPlace.update.mockResolvedValueOnce({
        id: "place_123",
        riderId: "rider_123",
        cityId: "city_karachi",
        designation,
        label: designation === "home" ? "Home" : "Office",
        address: designation === "home" ? "Home Road" : "Office Road",
        latitude: createDecimal(24.8711),
        longitude: createDecimal(67.0211),
        createdAt: new Date("2026-07-13T09:00:00.000Z"),
        updatedAt: new Date("2026-07-13T10:00:00.000Z"),
      });
      const repository = new PrismaSavedPlacesRepository(prisma as never);

      const place = await repository.savePlaceForRider({
        placeId: "place_123",
        riderId: "rider_123",
        cityId: "city_karachi",
        designation,
        label: designation === "home" ? "Home" : "Office",
        address: designation === "home" ? "Home Road" : "Office Road",
        latitude: 24.8711,
        longitude: 67.0211,
        timestamp: "2026-07-13T10:00:00.000Z",
      });

      expect(prisma.$transaction).toHaveBeenCalledOnce();
      expect(prisma.savedPlace.delete).toHaveBeenCalledWith({
        where: { id: "place_conflict" },
      });
      expect(prisma.savedPlace.update).toHaveBeenCalledWith({
        where: { id: "place_123" },
        data: {
          cityId: "city_karachi",
          designation,
          label: designation === "home" ? "Home" : "Office",
          address: designation === "home" ? "Home Road" : "Office Road",
          latitude: 24.8711,
          longitude: 67.0211,
          updatedAt: new Date("2026-07-13T10:00:00.000Z"),
        },
      });
      expect(place).toEqual(
        expect.objectContaining({
          id: "place_123",
          designation,
          label: designation === "home" ? "Home" : "Office",
        }),
      );
    },
  );

  it("returns false when deleting a place not owned by the rider", async () => {
    const prisma = createPrismaFake();
    prisma.savedPlace.deleteMany.mockResolvedValueOnce({ count: 0 });
    const repository = new PrismaSavedPlacesRepository(prisma as never);

    await expect(
      repository.deletePlaceForRider("place_404", "rider_123"),
    ).resolves.toBe(false);

    expect(prisma.savedPlace.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "place_404",
        riderId: "rider_123",
      },
    });
  });
});
