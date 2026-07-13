import { GUARDS_METADATA } from "@nestjs/common/constants";
import { describe, expect, it, vi } from "vitest";
import { RiderAuthGuard } from "../auth/rider-auth.guard";
import { RiderPlaceSearchController } from "./rider-place-search.controller";

describe("RiderPlaceSearchController", () => {
  it("uses the authenticated rider city for search and reverse geocoding", async () => {
    const service = {
      search: vi.fn().mockResolvedValue([]),
      reverse: vi.fn().mockResolvedValue(null),
    };
    const controller = new RiderPlaceSearchController(service as never);
    const rider = {
      id: "rider_123",
      phone: "+923001234567",
      cityId: "city_hyderabad",
    };

    await controller.searchPlaces(rider, "Station", "25.39", "68.35");
    await controller.reversePlace(rider, "25.39", "68.35");

    expect(service.search).toHaveBeenCalledWith({
      cityId: "city_hyderabad",
      query: "Station",
      proximityLatitude: "25.39",
      proximityLongitude: "68.35",
    });
    expect(service.reverse).toHaveBeenCalledWith({
      cityId: "city_hyderabad",
      latitude: "25.39",
      longitude: "68.35",
    });
  });

  it("requires rider authentication for every endpoint", () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, RiderPlaceSearchController),
    ).toContain(RiderAuthGuard);
  });
});
