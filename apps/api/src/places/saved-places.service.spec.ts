import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { InMemorySavedPlacesRepository } from "./in-memory-saved-places.repository";
import { SavedPlacesService } from "./saved-places.service";

describe("SavedPlacesService", () => {
  it("creates a custom saved place for the authenticated rider", async () => {
    const repository = new InMemorySavedPlacesRepository();
    const service = new SavedPlacesService(repository);

    const place = await service.createPlace({
      riderId: "rider_123",
      cityId: "city_karachi",
      label: "  Gym  ",
      address: "  Main Street  ",
      latitude: 24.8607,
      longitude: 67.0011,
    });

    expect(place).toEqual(
      expect.objectContaining({
        riderId: "rider_123",
        cityId: "city_karachi",
        designation: null,
        label: "Gym",
        address: "Main Street",
        latitude: 24.8607,
        longitude: 67.0011,
      }),
    );
  });

  it("replaces an existing designated place instead of creating a duplicate", async () => {
    const repository = new InMemorySavedPlacesRepository();
    const service = new SavedPlacesService(repository);

    await service.createPlace({
      riderId: "rider_123",
      cityId: "city_karachi",
      designation: "home",
      label: "Home",
      address: "Old Address",
      latitude: 24.8607,
      longitude: 67.0011,
    });

    const replacement = await service.createPlace({
      riderId: "rider_123",
      cityId: "city_karachi",
      designation: "home",
      label: "New Home",
      address: "New Address",
      latitude: 24.8711,
      longitude: 67.0211,
    });

    const places = await service.listPlaces("rider_123");

    expect(places).toHaveLength(1);
    expect(places[0]).toEqual(replacement);
    expect(places[0]).toEqual(
      expect.objectContaining({
        designation: "home",
        label: "New Home",
        address: "New Address",
      }),
    );
  });

  it("rejects invalid coordinates and empty trimmed strings", async () => {
    const repository = new InMemorySavedPlacesRepository();
    const service = new SavedPlacesService(repository);

    await expect(
      service.createPlace({
        riderId: "rider_123",
        cityId: "city_karachi",
        label: "   ",
        address: "Main Street",
        latitude: 24.8607,
        longitude: 67.0011,
      }),
    ).rejects.toThrow("Label cannot be empty");

    await expect(
      service.createPlace({
        riderId: "rider_123",
        cityId: "city_karachi",
        label: "Home",
        address: "   ",
        latitude: 24.8607,
        longitude: 67.0011,
      }),
    ).rejects.toThrow("Address cannot be empty");

    await expect(
      service.createPlace({
        riderId: "rider_123",
        cityId: "city_karachi",
        label: "Home",
        address: "Main Street",
        latitude: 91,
        longitude: 67.0011,
      }),
    ).rejects.toThrow("Latitude must be between -90 and 90");

    await expect(
      service.createPlace({
        riderId: "rider_123",
        cityId: "city_karachi",
        label: "Home",
        address: "Main Street",
        latitude: 24.8607,
        longitude: 181,
      }),
    ).rejects.toThrow("Longitude must be between -180 and 180");
  });

  it("returns bad request for missing or null label/address instead of crashing", async () => {
    const repository = new InMemorySavedPlacesRepository();
    const service = new SavedPlacesService(repository);
    const place = await service.createPlace({
      riderId: "rider_123",
      cityId: "city_karachi",
      label: "Cafe",
      address: "Coffee Street",
      latitude: 24.8607,
      longitude: 67.0011,
    });

    for (const request of [
      { label: null as never, address: "Main Street" },
      { label: "Home", address: null as never },
      { address: "Main Street" },
      { label: "Home" },
    ]) {
      await expect(
        service.createPlace({
          riderId: "rider_123",
          cityId: "city_karachi",
          latitude: 24.8607,
          longitude: 67.0011,
          ...request,
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    }

    for (const request of [
      { label: null as never, address: "Main Street" },
      { label: "Home", address: null as never },
      { address: "Main Street" },
      { label: "Home" },
    ]) {
      await expect(
        service.updatePlace({
          placeId: place.id,
          riderId: "rider_123",
          cityId: "city_karachi",
          latitude: 24.8607,
          longitude: 67.0011,
          ...request,
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it("returns not found when updating a place outside the rider scope", async () => {
    const repository = new InMemorySavedPlacesRepository();
    const service = new SavedPlacesService(repository);
    const place = await service.createPlace({
      riderId: "rider_123",
      cityId: "city_karachi",
      label: "Home",
      address: "Main Street",
      latitude: 24.8607,
      longitude: 67.0011,
    });

    await expect(
      service.updatePlace({
        placeId: place.id,
        riderId: "rider_other",
        cityId: "city_karachi",
        designation: "work",
        label: "Office",
        address: "Office Road",
        latitude: 24.8711,
        longitude: 67.0211,
      }),
    ).rejects.toThrow("Saved place not found");
  });

  it("deletes a rider-owned place", async () => {
    const repository = new InMemorySavedPlacesRepository();
    const service = new SavedPlacesService(repository);
    const place = await service.createPlace({
      riderId: "rider_123",
      cityId: "city_karachi",
      label: "Cafe",
      address: "Coffee Street",
      latitude: 24.8607,
      longitude: 67.0011,
    });

    await service.deletePlace({
      placeId: place.id,
      riderId: "rider_123",
    });

    await expect(service.listPlaces("rider_123")).resolves.toEqual([]);
  });

  it("returns not found when deleting a place outside the rider scope", async () => {
    const repository = new InMemorySavedPlacesRepository();
    const service = new SavedPlacesService(repository);
    const place = await service.createPlace({
      riderId: "rider_123",
      cityId: "city_karachi",
      label: "Cafe",
      address: "Coffee Street",
      latitude: 24.8607,
      longitude: 67.0011,
    });

    await expect(
      service.deletePlace({
        placeId: place.id,
        riderId: "rider_other",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(service.listPlaces("rider_123")).resolves.toEqual([place]);
  });
});
