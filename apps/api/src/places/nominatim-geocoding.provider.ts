import { GeocodingProvider } from "./geocoding.provider";
import {
  GeocodingPlace,
  GeocodingProviderException,
  GeocodingReverseRequest,
  GeocodingSearchRequest,
} from "./geocoding.types";

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

type NominatimGeocodingProviderOptions = {
  baseUrl: string;
  fetcher?: Fetcher;
  timeoutMilliseconds?: number;
};

export class NominatimGeocodingProvider extends GeocodingProvider {
  private readonly baseUrl: string;
  private readonly fetcher: Fetcher;
  private readonly timeoutMilliseconds: number;

  constructor(options: NominatimGeocodingProviderOptions) {
    super();
    this.baseUrl = options.baseUrl.trim().replace(/\/+$/, "");
    if (this.baseUrl.length === 0) {
      throw new Error("TAMI_NOMINATIM_BASE_URL is required");
    }
    this.fetcher = options.fetcher ?? globalThis.fetch;
    this.timeoutMilliseconds = options.timeoutMilliseconds ?? 5000;
  }

  async search(request: GeocodingSearchRequest): Promise<GeocodingPlace[]> {
    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set("q", request.query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("countrycodes", "pk");
    url.searchParams.set(
      "viewbox",
      [
        request.bounds.west,
        request.bounds.north,
        request.bounds.east,
        request.bounds.south,
      ].join(","),
    );
    url.searchParams.set("bounded", "1");
    url.searchParams.set("accept-language", "en");
    url.searchParams.set("limit", String(request.limit));
    const payload = await this.requestJson(url);
    if (!Array.isArray(payload)) {
      throw invalidData();
    }
    return payload.map(parsePlace);
  }

  async reverse(request: GeocodingReverseRequest): Promise<GeocodingPlace | null> {
    const url = new URL(`${this.baseUrl}/reverse`);
    url.searchParams.set("lat", String(request.latitude));
    url.searchParams.set("lon", String(request.longitude));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("accept-language", "en");
    const payload = await this.requestJson(url);
    if (isRecord(payload) && typeof payload.error === "string") {
      return null;
    }
    return parsePlace(payload);
  }

  private async requestJson(url: URL): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetcher(url.toString(), {
        headers: {
          accept: "application/json",
          "user-agent": "tami-api",
        },
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
    try {
      return await response.json();
    } catch (error) {
      throw new GeocodingProviderException(
        "Place search provider returned invalid data",
        {cause: error},
      );
    }
  }
}

function parsePlace(value: unknown): GeocodingPlace {
  if (!isRecord(value)) {
    throw invalidData();
  }
  const latitude = Number(value.lat);
  const longitude = Number(value.lon);
  const address =
    typeof value.display_name === "string" ? value.display_name : "";
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    address.length === 0
  ) {
    throw invalidData();
  }
  const name =
    typeof value.name === "string" && value.name.trim().length > 0
      ? value.name
      : address.split(",")[0]!.trim();
  return {
    providerId: createProviderId(value),
    name,
    address,
    latitude,
    longitude,
  };
}

function createProviderId(value: Record<string, unknown>): string {
  if (typeof value.osm_type === "string" && value.osm_id != null) {
    return `nominatim-${value.osm_type}-${value.osm_id}`;
  }
  if (value.place_id != null) {
    return `nominatim-place-${value.place_id}`;
  }
  throw invalidData();
}

function invalidData(): GeocodingProviderException {
  return new GeocodingProviderException(
    "Place search provider returned invalid data",
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
