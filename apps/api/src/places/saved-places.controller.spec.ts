import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { SavedPlacesController } from "./saved-places.controller";
import { InMemorySavedPlacesRepository } from "./in-memory-saved-places.repository";
import { SavedPlacesService } from "./saved-places.service";

describe("SavedPlacesController", () => {
  it("reads and writes places for the authenticated rider only", async () => {
    const controller = new SavedPlacesController(
      new SavedPlacesService(new InMemorySavedPlacesRepository()),
    );
    const rider = {
      id: "rider_123",
      cityId: "city_karachi",
      phone: "+923001234567",
    };

    const created = await controller.createPlace(rider, {
      designation: "home",
      label: "Home",
      address: "Main Street",
      latitude: 24.8607,
      longitude: 67.0011,
      riderId: "rider_other",
      cityId: "city_other",
    } as never);

    expect(created).toEqual(
      expect.objectContaining({
        riderId: "rider_123",
        cityId: "city_karachi",
        designation: "home",
      }),
    );

    await expect(controller.listPlaces(rider)).resolves.toEqual([created]);
  });

  it("updates and deletes places within the authenticated rider scope", async () => {
    const controller = new SavedPlacesController(
      new SavedPlacesService(new InMemorySavedPlacesRepository()),
    );
    const rider = {
      id: "rider_123",
      cityId: "city_karachi",
      phone: "+923001234567",
    };
    const place = await controller.createPlace(rider, {
      label: "Cafe",
      address: "Coffee Street",
      latitude: 24.8607,
      longitude: 67.0011,
    });

    const updated = await controller.updatePlace(rider, place.id, {
      designation: "work",
      label: "Office",
      address: "Office Road",
      latitude: 24.8711,
      longitude: 67.0211,
    });

    expect(updated).toEqual(
      expect.objectContaining({
        id: place.id,
        riderId: "rider_123",
        designation: "work",
        label: "Office",
      }),
    );

    await expect(controller.deletePlace(rider, place.id)).resolves.toBeUndefined();
    await expect(controller.listPlaces(rider)).resolves.toEqual([]);
  });

  it("returns not found when the rider updates a place they do not own", async () => {
    const controller = new SavedPlacesController(
      new SavedPlacesService(new InMemorySavedPlacesRepository()),
    );
    const owner = {
      id: "rider_owner",
      cityId: "city_karachi",
      phone: "+923001234567",
    };
    const otherRider = {
      id: "rider_other",
      cityId: "city_karachi",
      phone: "+923009876543",
    };
    const place = await controller.createPlace(owner, {
      label: "Home",
      address: "Main Street",
      latitude: 24.8607,
      longitude: 67.0011,
    });

    await expect(
      controller.updatePlace(otherRider, place.id, {
        label: "Office",
        address: "Office Road",
        latitude: 24.8711,
        longitude: 67.0211,
      }),
    ).rejects.toThrow("Saved place not found");
  });

  it("returns bad request when label or address is missing or null in the request body", async () => {
    const controller = new SavedPlacesController(
      new SavedPlacesService(new InMemorySavedPlacesRepository()),
    );
    const rider = {
      id: "rider_123",
      cityId: "city_karachi",
      phone: "+923001234567",
    };

    for (const request of [
      {
        address: "Main Street",
        latitude: 24.8607,
        longitude: 67.0011,
      },
      {
        label: "Home",
        latitude: 24.8607,
        longitude: 67.0011,
      },
      {
        label: null as never,
        address: "Main Street",
        latitude: 24.8607,
        longitude: 67.0011,
      },
      {
        label: "Home",
        address: null as never,
        latitude: 24.8607,
        longitude: 67.0011,
      },
    ]) {
      await expect(
        controller.createPlace(rider, request as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    }

    const place = await controller.createPlace(rider, {
      label: "Cafe",
      address: "Coffee Street",
      latitude: 24.8607,
      longitude: 67.0011,
    });

    for (const request of [
      {
        address: "Main Street",
        latitude: 24.8607,
        longitude: 67.0011,
      },
      {
        label: "Home",
        latitude: 24.8607,
        longitude: 67.0011,
      },
      {
        label: null as never,
        address: "Main Street",
        latitude: 24.8607,
        longitude: 67.0011,
      },
      {
        label: "Home",
        address: null as never,
        latitude: 24.8607,
        longitude: 67.0011,
      },
    ]) {
      await expect(
        controller.updatePlace(rider, place.id, request as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it("returns not found when the rider deletes a place they do not own", async () => {
    const controller = new SavedPlacesController(
      new SavedPlacesService(new InMemorySavedPlacesRepository()),
    );
    const owner = {
      id: "rider_owner",
      cityId: "city_karachi",
      phone: "+923001234567",
    };
    const otherRider = {
      id: "rider_other",
      cityId: "city_karachi",
      phone: "+923009876543",
    };
    const place = await controller.createPlace(owner, {
      label: "Home",
      address: "Main Street",
      latitude: 24.8607,
      longitude: 67.0011,
    });

    await expect(
      controller.deletePlace(otherRider, place.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
