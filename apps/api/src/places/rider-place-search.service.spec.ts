import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { CityMapProfileRepository } from "./city-map-profile.repository";
import { GeocodingProvider } from "./geocoding.provider";
import { RiderPlaceSearchService } from "./rider-place-search.service";

describe("RiderPlaceSearchService", () => {
  it("scopes forward search to the authenticated rider city profile", async () => {
    const provider = createProvider();
    provider.search.mockResolvedValue([
      {
        providerId: "poi.123",
        name: "Civic Centre",
        address: "Civic Centre, Karachi, Sindh",
        latitude: 24.9176,
        longitude: 67.0719,
      },
    ]);
    const service = new RiderPlaceSearchService(
      createRepository(),
      provider as never,
    );

    const result = await service.search({
      cityId: "city_karachi",
      query: "  Civic Centre  ",
      proximityLatitude: "24.86",
      proximityLongitude: "67.01",
    });

    expect(provider.search).toHaveBeenCalledWith({
      query: "Civic Centre",
      bounds: {west: 66.6, south: 24.65, east: 67.6, north: 25.45},
      proximity: {latitude: 24.86, longitude: 67.01},
      limit: 5,
    });
    expect(result).toEqual([
      {
        id: "poi.123",
        name: "Civic Centre",
        address: "Civic Centre, Karachi, Sindh",
        latitude: 24.9176,
        longitude: 67.0719,
        cityId: "city_karachi",
      },
    ]);
  });

  it("rejects short queries and incomplete or invalid proximity", async () => {
    const service = new RiderPlaceSearchService(
      createRepository(),
      createProvider() as never,
    );

    await expect(
      service.search({cityId: "city_karachi", query: "a"}),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.search({
        cityId: "city_karachi",
        query: "Airport",
        proximityLatitude: "24.8",
      }),
    ).rejects.toThrow("Both proximity coordinates are required");
    await expect(
      service.search({
        cityId: "city_karachi",
        query: "Airport",
        proximityLatitude: "north",
        proximityLongitude: "67",
      }),
    ).rejects.toThrow("Proximity coordinates are invalid");
  });

  it("reverse geocodes only coordinates inside the rider city bounds", async () => {
    const provider = createProvider();
    provider.reverse.mockResolvedValue({
      providerId: "address.1",
      name: "Frere Hall",
      address: "Frere Hall, Civil Lines, Karachi",
      latitude: 24.8468,
      longitude: 67.0303,
    });
    const service = new RiderPlaceSearchService(
      createRepository(),
      provider as never,
    );

    await expect(
      service.reverse({
        cityId: "city_karachi",
        latitude: "25.8",
        longitude: "67.03",
      }),
    ).rejects.toThrow("Location is outside the selected service city");

    await expect(
      service.reverse({
        cityId: "city_karachi",
        latitude: "24.8468",
        longitude: "67.0303",
      }),
    ).resolves.toEqual(
      expect.objectContaining({id: "address.1", cityId: "city_karachi"}),
    );
  });

  it("rejects a city without a complete map profile", async () => {
    const repository = {
      findActiveById: vi.fn().mockResolvedValue(null),
    } as unknown as CityMapProfileRepository;
    const service = new RiderPlaceSearchService(
      repository,
      createProvider() as never,
    );

    await expect(
      service.search({cityId: "city_unknown", query: "Airport"}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function createRepository(): CityMapProfileRepository {
  return {
    findActiveById: vi.fn().mockResolvedValue({
      id: "city_karachi",
      name: "Karachi",
      center: {latitude: 24.8607, longitude: 67.0011},
      bounds: {west: 66.6, south: 24.65, east: 67.6, north: 25.45},
    }),
  } as unknown as CityMapProfileRepository;
}

function createProvider() {
  return {
    search: vi.fn<GeocodingProvider["search"]>(),
    reverse: vi.fn<GeocodingProvider["reverse"]>(),
  };
}
