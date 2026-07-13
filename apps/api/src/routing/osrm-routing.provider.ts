import { RoutingProvider } from "./routing.provider";
import {
  ProviderRoute,
  RouteCoordinate,
  RouteProviderRequest,
  RoutingProviderException,
} from "./routing.types";

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

type OsrmRoutingProviderOptions = {
  baseUrl: string;
  fetcher?: Fetcher;
  timeoutMilliseconds?: number;
};

export class OsrmRoutingProvider extends RoutingProvider {
  private readonly baseUrl: string;
  private readonly fetcher: Fetcher;
  private readonly timeoutMilliseconds: number;

  constructor(options: OsrmRoutingProviderOptions) {
    super();
    this.baseUrl = options.baseUrl.trim().replace(/\/+$/, "");
    if (this.baseUrl.length === 0) {
      throw new Error("TAMI_ROUTING_BASE_URL is required");
    }
    this.fetcher = options.fetcher ?? globalThis.fetch;
    this.timeoutMilliseconds = options.timeoutMilliseconds ?? 7000;
  }

  async getDrivingRoute(request: RouteProviderRequest): Promise<ProviderRoute> {
    const coordinates = [request.pickup, request.destination]
      .map((coordinate) => `${coordinate.longitude},${coordinate.latitude}`)
      .join(";");
    const url = new URL(
      `/route/v1/driving/${coordinates}`,
      `${this.baseUrl}/`,
    );
    url.searchParams.set("alternatives", "false");
    url.searchParams.set("steps", "false");
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");

    let response: Response;
    try {
      response = await this.fetcher(url.toString(), {
        headers: {accept: "application/json"},
        signal: AbortSignal.timeout(this.timeoutMilliseconds),
      });
    } catch (error) {
      throw new RoutingProviderException("Routing provider is unavailable", {
        cause: error,
      });
    }
    if (!response.ok) {
      throw new RoutingProviderException("Routing provider is unavailable");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new RoutingProviderException(
        "Routing provider returned invalid data",
        {cause: error},
      );
    }
    return parseRoute(payload);
  }
}

function parseRoute(payload: unknown): ProviderRoute {
  if (!isRecord(payload) || !Array.isArray(payload.routes)) {
    throw new RoutingProviderException("Routing provider returned invalid data");
  }
  if (payload.code !== "Ok" || payload.routes.length === 0) {
    throw new RoutingProviderException("No driving route is available");
  }
  const route = payload.routes[0];
  if (
    !isRecord(route) ||
    !Number.isFinite(route.distance) ||
    !Number.isFinite(route.duration) ||
    (route.distance as number) <= 0 ||
    (route.duration as number) <= 0 ||
    !isRecord(route.geometry) ||
    route.geometry.type !== "LineString" ||
    !Array.isArray(route.geometry.coordinates) ||
    route.geometry.coordinates.length < 2
  ) {
    throw new RoutingProviderException("Routing provider returned invalid data");
  }
  const coordinates = route.geometry.coordinates.map(parseCoordinate);
  return {
    distanceMeters: Math.round(route.distance as number),
    durationSeconds: Math.round(route.duration as number),
    provider: "osrm",
    coordinates,
  };
}

function parseCoordinate(value: unknown): RouteCoordinate {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    !Number.isFinite(value[0]) ||
    !Number.isFinite(value[1])
  ) {
    throw new RoutingProviderException("Routing provider returned invalid data");
  }
  const longitude = value[0] as number;
  const latitude = value[1] as number;
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    throw new RoutingProviderException("Routing provider returned invalid data");
  }
  return {latitude, longitude};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
