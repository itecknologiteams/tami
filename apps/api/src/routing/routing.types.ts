import { Coordinates } from "../bookings/booking.types";

export type RouteEndpoint = Pick<Coordinates, "latitude" | "longitude">;

export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type RouteProviderRequest = {
  pickup: RouteEndpoint;
  destination: RouteEndpoint;
};

export type ProviderRoute = {
  distanceMeters: number;
  durationSeconds: number;
  provider: string;
  coordinates: RouteCoordinate[];
};

export type RoutePreview = ProviderRoute & {
  method: "osrm_v1";
};

export class RoutingProviderException extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RoutingProviderException";
  }
}
