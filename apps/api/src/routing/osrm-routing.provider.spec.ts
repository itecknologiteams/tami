import { describe, expect, it, vi } from "vitest";
import { OsrmRoutingProvider } from "./osrm-routing.provider";

describe("OsrmRoutingProvider", () => {
  it("requests a full GeoJSON driving route and maps its metrics", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        code: "Ok",
        routes: [
          {
            distance: 6123.6,
            duration: 931.2,
            geometry: {
              type: "LineString",
              coordinates: [
                [67.0011, 24.8607],
                [67.0211, 24.8711],
                [67.0407, 24.8753],
              ],
            },
          },
        ],
      }),
    );
    const provider = new OsrmRoutingProvider({
      baseUrl: "https://routing.tami.gov.pk",
      fetcher,
    });

    const route = await provider.getDrivingRoute({
      pickup: {latitude: 24.8607, longitude: 67.0011},
      destination: {latitude: 24.8753, longitude: 67.0407},
    });

    expect(fetcher).toHaveBeenCalledOnce();
    const url = new URL(fetcher.mock.calls[0]![0]);
    expect(url.origin + url.pathname).toBe(
      "https://routing.tami.gov.pk/route/v1/driving/67.0011,24.8607;67.0407,24.8753",
    );
    expect(url.searchParams.get("overview")).toBe("full");
    expect(url.searchParams.get("geometries")).toBe("geojson");
    expect(url.searchParams.get("steps")).toBe("false");
    expect(route).toEqual({
      distanceMeters: 6124,
      durationSeconds: 931,
      provider: "osrm",
      coordinates: [
        {latitude: 24.8607, longitude: 67.0011},
        {latitude: 24.8711, longitude: 67.0211},
        {latitude: 24.8753, longitude: 67.0407},
      ],
    });
  });

  it("rejects no-route and malformed geometry responses", async () => {
    const noRoute = new OsrmRoutingProvider({
      baseUrl: "https://routing.tami.gov.pk",
      fetcher: vi.fn().mockResolvedValue(
        jsonResponse({code: "NoRoute", routes: []}),
      ),
    });
    await expect(
      noRoute.getDrivingRoute({
        pickup: {latitude: 24.8607, longitude: 67.0011},
        destination: {latitude: 24.8753, longitude: 67.0407},
      }),
    ).rejects.toThrow("No driving route is available");

    const malformed = new OsrmRoutingProvider({
      baseUrl: "https://routing.tami.gov.pk",
      fetcher: vi.fn().mockResolvedValue(
        jsonResponse({
          code: "Ok",
          routes: [
            {
              distance: 100,
              duration: 60,
              geometry: {type: "LineString", coordinates: [[67.01]]},
            },
          ],
        }),
      ),
    });
    await expect(
      malformed.getDrivingRoute({
        pickup: {latitude: 24.8607, longitude: 67.0011},
        destination: {latitude: 24.8753, longitude: 67.0407},
      }),
    ).rejects.toThrow("Routing provider returned invalid data");
  });

  it("rejects HTTP and network failures without leaking response content", async () => {
    const httpFailure = new OsrmRoutingProvider({
      baseUrl: "https://routing.tami.gov.pk",
      fetcher: vi.fn().mockResolvedValue(jsonResponse({secret: "detail"}, 503)),
    });
    await expect(
      httpFailure.getDrivingRoute({
        pickup: {latitude: 24.8607, longitude: 67.0011},
        destination: {latitude: 24.8753, longitude: 67.0407},
      }),
    ).rejects.toThrow("Routing provider is unavailable");

    const networkFailure = new OsrmRoutingProvider({
      baseUrl: "https://routing.tami.gov.pk",
      fetcher: vi.fn().mockRejectedValue(new Error("socket secret")),
    });
    await expect(
      networkFailure.getDrivingRoute({
        pickup: {latitude: 24.8607, longitude: 67.0011},
        destination: {latitude: 24.8753, longitude: 67.0407},
      }),
    ).rejects.toThrow("Routing provider is unavailable");
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {"content-type": "application/json"},
  });
}
