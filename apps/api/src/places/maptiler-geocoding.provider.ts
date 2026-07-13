import { GeocodingProvider } from "./geocoding.provider";
import {
  GeocodingPlace,
  GeocodingProviderException,
  GeocodingReverseRequest,
  GeocodingSearchRequest,
} from "./geocoding.types";

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

type MapTilerGeocodingProviderOptions = {
  apiKey: string;
  fetcher?: Fetcher;
  baseUrl?: string;
  timeoutMilliseconds?: number;
};

export class MapTilerGeocodingProvider extends GeocodingProvider {
  private readonly apiKey: string;
  private readonly fetcher: Fetcher;
  private readonly baseUrl: string;
  private readonly timeoutMilliseconds: number;

  constructor(options: MapTilerGeocodingProviderOptions) {
    super();
    this.apiKey = options.apiKey.trim();
    if (this.apiKey.length === 0) {
      throw new Error("TAMI_MAPTILER_API_KEY is required");
    }
    this.fetcher = options.fetcher ?? globalThis.fetch;
    this.baseUrl = options.baseUrl ?? "https://api.maptiler.com";
    this.timeoutMilliseconds = options.timeoutMilliseconds ?? 5000;
  }

  async search(request: GeocodingSearchRequest): Promise<GeocodingPlace[]> {
    const url = this.createUrl(encodeURIComponent(request.query));
    url.searchParams.set("country", "pk");
    url.searchParams.set(
      "bbox",
      [
        request.bounds.west,
        request.bounds.south,
        request.bounds.east,
        request.bounds.north,
      ].join(","),
    );
    if (request.proximity != null) {
      url.searchParams.set(
        "proximity",
        `${request.proximity.longitude},${request.proximity.latitude}`,
      );
    }
    url.searchParams.set("autocomplete", "true");
    url.searchParams.set("language", "en");
    url.searchParams.set("limit", String(request.limit));
    return this.requestPlaces(url);
  }

  async reverse(request: GeocodingReverseRequest): Promise<GeocodingPlace | null> {
    const url = this.createUrl(`${request.longitude},${request.latitude}`);
    url.searchParams.set("country", "pk");
    url.searchParams.set("autocomplete", "false");
    url.searchParams.set("language", "en");
    url.searchParams.set("limit", "1");
    const places = await this.requestPlaces(url);
    return places[0] ?? null;
  }

  private createUrl(query: string): URL {
    const url = new URL(`/geocoding/${query}.json`, this.baseUrl);
    url.searchParams.set("key", this.apiKey);
    return url;
  }

  private async requestPlaces(url: URL): Promise<GeocodingPlace[]> {
    let response: Response;
    try {
      response = await this.fetcher(url.toString(), {
        headers: {accept: "application/json"},
        signal: AbortSignal.timeout(this.timeoutMilliseconds),
      });
    } catch (error) {
      throw new GeocodingProviderException(
        "Place search provider is unavailable",
        {cause: error},
      );
    }
    if (!response.ok) {
      throw new GeocodingProviderException(
        "Place search provider is unavailable",
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new GeocodingProviderException(
        "Place search provider returned invalid data",
        {cause: error},
      );
    }
    return parsePlaces(payload);
  }
}

function parsePlaces(payload: unknown): GeocodingPlace[] {
  if (!isRecord(payload) || !Array.isArray(payload.features)) {
    throw new GeocodingProviderException(
      "Place search provider returned invalid data",
    );
  }
  return payload.features.map((feature) => {
    if (
      !isRecord(feature) ||
      typeof feature.id !== "string" ||
      typeof feature.text !== "string" ||
      typeof feature.place_name !== "string" ||
      !Array.isArray(feature.center) ||
      feature.center.length < 2 ||
      !Number.isFinite(feature.center[0]) ||
      !Number.isFinite(feature.center[1])
    ) {
      throw new GeocodingProviderException(
        "Place search provider returned invalid data",
      );
    }
    return {
      providerId: feature.id,
      name: feature.text,
      address: feature.place_name,
      longitude: feature.center[0] as number,
      latitude: feature.center[1] as number,
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
