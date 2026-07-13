import { ProviderRoute, RouteProviderRequest } from "./routing.types";

export abstract class RoutingProvider {
  abstract getDrivingRoute(request: RouteProviderRequest): Promise<ProviderRoute>;
}
