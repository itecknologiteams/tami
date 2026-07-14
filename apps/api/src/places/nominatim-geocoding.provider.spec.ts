import { describe, expect, it, vi } from "vitest";
import { NominatimGeocodingProvider } from "./nominatim-geocoding.provider";

describe("NominatimGeocodingProvider", () => {
  it("searches within Pakistan bounded to the rider city viewbox", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          place_id: 12345,
          osm_type: "way",
          osm_id: 98765,
          lat: "24.9176",
          lon: "67.0719",
          name: "Civic Centre",
          display_name: "Civic Centre, Gulshan-e-Iqbal, Karachi, Sindh, Pakistan",
        },
      ]),
    );
    const provider = new NominatimGeocodingProvider({
      baseUrl: "http://127.0.0.1:8090",
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
    expect(url.origin + url.pathname).toBe("http://127.0.0.1:8090/search");
    expect(url.searchParams.get("q")).toBe("Civic Centre");
    expect(url.searchParams.get("format")).toBe("jsonv2");
    expect(url.searchParams.get("countrycodes")).toBe("pk");
    expect(url.searchParams.get("viewbox")).toBe("66.6,25.45,67.6,24.65");
    expect(url.searchParams.get("bounded")).toBe("1");
    expect(url.searchParams.get("accept-language")).toBe("en");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(result).toEqual([
      {
        providerId: "nominatim-way-98765",
        name: "Civic Centre",
        address: "Civic Centre, Gulshan-e-Iqbal, Karachi, Sindh, Pakistan",
        latitude: 24.9176,
        longitude: 67.0719,
      },
    ]);
  });

  it("falls back to the display name head when a result has no name", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          place_id: 555,
          osm_type: "node",
          osm_id: 777,
          lat: "24.8468",
          lon: "67.0303",
          name: "",
          display_name: "Fatima Jinnah Road, Civil Lines, Karachi, Sindh",
        },
      ]),
    );
    const provider = new NominatimGeocodingProvider({
      baseUrl: "http://127.0.0.1:8090",
      fetcher,
    });

    const result = await provider.search(searchRequest("Fatima Jinnah"));

    expect(result).toEqual([
      {
        providerId: "nominatim-node-777",
        name: "Fatima Jinnah Road",
        address: "Fatima Jinnah Road, Civil Lines, Karachi, Sindh",
        latitude: 24.8468,
        longitude: 67.0303,
      },
    ]);
  });

  it("reverse geocodes a coordinate", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        place_id: 222,
        osm_type: "way",
        osm_id: 333,
        lat: "24.8468",
        lon: "67.0303",
        name: "Frere Hall",
        display_name: "Frere Hall, Civil Lines, Karachi, Sindh, Pakistan",
      }),
    );
    const provider = new NominatimGeocodingProvider({
      baseUrl: "http://127.0.0.1:8090",
      fetcher,
    });

    const place = await provider.reverse({
      latitude: 24.8468,
      longitude: 67.0303,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    const url = new URL(fetcher.mock.calls[0]![0]);
    expect(url.origin + url.pathname).toBe("http://127.0.0.1:8090/reverse");
    expect(url.searchParams.get("lat")).toBe("24.8468");
    expect(url.searchParams.get("lon")).toBe("67.0303");
    expect(url.searchParams.get("format")).toBe("jsonv2");
    expect(url.searchParams.get("accept-language")).toBe("en");
    expect(place).toEqual({
      providerId: "nominatim-way-333",
      name: "Frere Hall",
      address: "Frere Hall, Civil Lines, Karachi, Sindh, Pakistan",
      latitude: 24.8468,
      longitude: 67.0303,
    });
  });

  it("returns null when reverse geocoding finds nothing", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({error: "Unable to geocode"}));
    const provider = new NominatimGeocodingProvider({
      baseUrl: "http://127.0.0.1:8090",
      fetcher,
    });

    const place = await provider.reverse({latitude: 0, longitude: 0});

    expect(place).toBeNull();
  });

  it("raises a provider exception when the service is unreachable", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));
    const provider = new NominatimGeocodingProvider({
      baseUrl: "http://127.0.0.1:8090",
      fetcher,
    });

    await expect(provider.search(searchRequest("Clifton"))).rejects.toThrow(
      "Place search provider is unavailable",
    );
  });

  it("raises a provider exception on a non-success response", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("Bad Gateway", {status: 502}));
    const provider = new NominatimGeocodingProvider({
      baseUrl: "http://127.0.0.1:8090",
      fetcher,
    });

    await expect(
      provider.reverse({latitude: 24.8, longitude: 67.0}),
    ).rejects.toThrow("Place search provider is unavailable");
  });

  it("raises a provider exception on malformed payloads", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse([{lat: "not-a-number"}]));
    const provider = new NominatimGeocodingProvider({
      baseUrl: "http://127.0.0.1:8090",
      fetcher,
    });

    await expect(provider.search(searchRequest("Clifton"))).rejects.toThrow(
      "Place search provider returned invalid data",
    );
  });

  it("rejects a blank base url", () => {
    expect(
      () => new NominatimGeocodingProvider({baseUrl: "   "}),
    ).toThrow("TAMI_NOMINATIM_BASE_URL is required");
  });
});

function searchRequest(query: string) {
  return {
    query,
    bounds: {west: 66.6, south: 24.65, east: 67.6, north: 25.45},
    limit: 5,
  };
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {"content-type": "application/json"},
  });
}
