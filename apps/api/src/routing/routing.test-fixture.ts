import { Coordinates } from "../bookings/booking.types";
import { RoutingProvider } from "./routing.provider";
import { RoutingService } from "./routing.service";
import { ProviderRoute } from "./routing.types";

export function createTestRoutingService(
  route: Partial<ProviderRoute> = {},
): RoutingService {
  return new RoutingService({
    async getDrivingRoute(request) {
      return {
        distanceMeters: route.distanceMeters ?? 6124,
        durationSeconds: route.durationSeconds ?? 931,
        provider: route.provider ?? "osrm-test",
        coordinates:
          route.coordinates ?? [toCoordinate(request.pickup), toCoordinate(request.destination)],
      };
    },
  } as RoutingProvider);
}

function toCoordinate(coordinate: Pick<Coordinates, "latitude" | "longitude">) {
  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
  };
}
