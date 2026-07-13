import { describe, expect, it, vi } from "vitest";
import { MapTilerGeocodingProvider } from "./maptiler-geocoding.provider";

describe("MapTilerGeocodingProvider", () => {
  it("searches within Pakistan and the rider city bounds", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        features: [
          {
            id: "poi.123",
            text: "Civic Centre",
            place_name: "Civic Centre, Gulshan-e-Iqbal, Karachi, Sindh",
            center: [67.0719, 24.9176],
          },
        ],
      }),
    );
    const provider = new MapTilerGeocodingProvider({
      apiKey: "server-secret",
      fetcher,
    });

    const result = await provider.search({
      query: "Civic Centre",
      bounds: {
        west: 66.6,
        south: 24.65,
        east: 67.6,
        north: 25.45,
      },
      proximity: {latitude: 24.8607, longitude: 67.0011},
      limit: 5,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    const url = new URL(fetcher.mock.calls[0]![0]);
    expect(url.origin + url.pathname).toBe(
      "https://api.maptiler.com/geocoding/Civic%20Centre.json",
    );
    expect(url.searchParams.get("key")).toBe("server-secret");
    expect(url.searchParams.get("country")).toBe("pk");
    expect(url.searchParams.get("bbox")).toBe("66.6,24.65,67.6,25.45");
    expect(url.searchParams.get("proximity")).toBe("67.0011,24.8607");
    expect(url.searchParams.get("autocomplete")).toBe("true");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(result).toEqual([
      {
        providerId: "poi.123",
        name: "Civic Centre",
        address: "Civic Centre, Gulshan-e-Iqbal, Karachi, Sindh",
        latitude: 24.9176,
        longitude: 67.0719,
      },
    ]);
  });

  it("reverse geocodes a coordinate with autocomplete disabled", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        features: [
          {
            id: "address.456",
            text: "Frere Hall",
            place_name: "Frere Hall, Civil Lines, Karachi, Sindh",
            center: [67.0303, 24.8468],
          },
        ],
      }),
    );
    const provider = new MapTilerGeocodingProvider({
      apiKey: "server-secret",
      fetcher,
    });

    const place = await provider.reverse({
      latitude: 24.8468,
      longitude: 67.0303,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    const url = new URL(fetcher.mock.calls[0]![0]);
    expect(url.pathname).toBe("/geocoding/67.0303,24.8468.json");
    expect(url.searchParams.get("country")).toBe("pk");
    expect(url.searchParams.get("autocomplete")).toBe("false");
    expect(url.searchParams.get("limit")).toBe("1");
    expect(place?.providerId).toBe("address.456");
  });

  it("rejects provider failures and malformed feature coordinates", async () => {
    const failedProvider = new MapTilerGeocodingProvider({
      apiKey: "server-secret",
      fetcher: vi.fn().mockResolvedValue(jsonResponse({}, 503)),
    });
    await expect(
      failedProvider.search({
        query: "Airport",
        bounds: {west: 66.6, south: 24.65, east: 67.6, north: 25.45},
        limit: 5,
      }),
    ).rejects.toThrow("Place search provider is unavailable");

    const malformedProvider = new MapTilerGeocodingProvider({
      apiKey: "server-secret",
      fetcher: vi.fn().mockResolvedValue(
        jsonResponse({
          features: [
            {
              id: "poi.bad",
              text: "Bad place",
              place_name: "Bad place",
              center: ["not-a-longitude", 24.8],
            },
          ],
        }),
      ),
    });
    await expect(
      malformedProvider.search({
        query: "Airport",
        bounds: {west: 66.6, south: 24.65, east: 67.6, north: 25.45},
        limit: 5,
      }),
    ).rejects.toThrow("Place search provider returned invalid data");
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {"content-type": "application/json"},
  });
}
