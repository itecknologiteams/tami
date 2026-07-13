import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { RoutingProvider } from "./routing.provider";
import { RoutingProviderException } from "./routing.types";
import { RoutingService } from "./routing.service";

describe("RoutingService", () => {
  it("returns validated provider geometry with stable route metadata", async () => {
    const provider = {
      getDrivingRoute: vi.fn().mockResolvedValue({
        distanceMeters: 6124,
        durationSeconds: 931,
        provider: "osrm",
        coordinates: [
          {latitude: 24.8607, longitude: 67.0011},
          {latitude: 24.8753, longitude: 67.0407},
        ],
      }),
    } as unknown as RoutingProvider;
    const service = new RoutingService(provider);

    await expect(
      service.previewDrivingRoute(
        {latitude: 24.8607, longitude: 67.0011, address: "Pickup"},
        {latitude: 24.8753, longitude: 67.0407, address: "Destination"},
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        method: "osrm_v1",
        provider: "osrm",
        distanceMeters: 6124,
      }),
    );
  });

  it("rejects invalid and identical coordinates before calling the provider", async () => {
    const provider = {
      getDrivingRoute: vi.fn(),
    } as unknown as RoutingProvider;
    const service = new RoutingService(provider);

    await expect(
      service.previewDrivingRoute(
        {latitude: 91, longitude: 67, address: "Pickup"},
        {latitude: 24.8, longitude: 67.1, address: "Destination"},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.previewDrivingRoute(
        {latitude: 24.8, longitude: 67.1, address: "Pickup"},
        {latitude: 24.8, longitude: 67.1, address: "Destination"},
      ),
    ).rejects.toThrow("Pickup and destination must be different");
    expect(provider.getDrivingRoute).not.toHaveBeenCalled();
  });

  it("maps provider failures to a stable service-unavailable response", async () => {
    const provider = {
      getDrivingRoute: vi
        .fn()
        .mockRejectedValue(
          new RoutingProviderException("Routing provider is unavailable"),
        ),
    } as unknown as RoutingProvider;
    const service = new RoutingService(provider);

    await expect(
      service.previewDrivingRoute(
        {latitude: 24.8, longitude: 67.1, address: "Pickup"},
        {latitude: 24.9, longitude: 67.2, address: "Destination"},
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
