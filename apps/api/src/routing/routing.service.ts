import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Coordinates } from "../bookings/booking.types";
import { RoutingProvider } from "./routing.provider";
import {
  RouteCoordinate,
  RoutePreview,
  RoutingProviderException,
} from "./routing.types";

@Injectable()
export class RoutingService {
  constructor(private readonly provider: RoutingProvider) {}

  async previewDrivingRoute(
    pickup: Coordinates,
    destination: Coordinates,
  ): Promise<RoutePreview> {
    validateCoordinate(pickup, "Pickup");
    validateCoordinate(destination, "Destination");
    if (
      pickup.latitude === destination.latitude &&
      pickup.longitude === destination.longitude
    ) {
      throw new BadRequestException("Pickup and destination must be different");
    }
    try {
      const route = await this.provider.getDrivingRoute({pickup, destination});
      validateRoute(route.distanceMeters, route.durationSeconds, route.coordinates);
      return {...route, method: "osrm_v1"};
    } catch (error) {
      if (error instanceof RoutingProviderException) {
        throw new ServiceUnavailableException(error.message);
      }
      throw error;
    }
  }
}

function validateCoordinate(coordinate: Coordinates, label: string): void {
  if (
    !Number.isFinite(coordinate?.latitude) ||
    coordinate.latitude < -90 ||
    coordinate.latitude > 90
  ) {
    throw new BadRequestException(`${label} latitude is invalid`);
  }
  if (
    !Number.isFinite(coordinate.longitude) ||
    coordinate.longitude < -180 ||
    coordinate.longitude > 180
  ) {
    throw new BadRequestException(`${label} longitude is invalid`);
  }
}

function validateRoute(
  distanceMeters: number,
  durationSeconds: number,
  coordinates: RouteCoordinate[],
): void {
  if (
    !Number.isFinite(distanceMeters) ||
    distanceMeters <= 0 ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    coordinates.some(
      (coordinate) =>
        !Number.isFinite(coordinate.latitude) ||
        !Number.isFinite(coordinate.longitude) ||
        coordinate.latitude < -90 ||
        coordinate.latitude > 90 ||
        coordinate.longitude < -180 ||
        coordinate.longitude > 180,
    )
  ) {
    throw new ServiceUnavailableException("Routing provider returned invalid data");
  }
}
