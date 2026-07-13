import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { CityMapProfileRepository } from "./city-map-profile.repository";
import { GeocodingProvider } from "./geocoding.provider";
import {
  GeocodingCoordinate,
  GeocodingProviderException,
  RiderSearchPlace,
} from "./geocoding.types";

type SearchRequest = {
  cityId: string;
  query: unknown;
  proximityLatitude?: unknown;
  proximityLongitude?: unknown;
};

type ReverseRequest = {
  cityId: string;
  latitude: unknown;
  longitude: unknown;
};

@Injectable()
export class RiderPlaceSearchService {
  constructor(
    private readonly cityRepository: CityMapProfileRepository,
    private readonly geocodingProvider: GeocodingProvider,
  ) {}

  async search(request: SearchRequest): Promise<RiderSearchPlace[]> {
    const query = validateQuery(request.query);
    const city = await this.requireCity(request.cityId);
    const proximity = parseOptionalProximity(
      request.proximityLatitude,
      request.proximityLongitude,
    );
    try {
      const places = await this.geocodingProvider.search({
        query,
        bounds: city.bounds,
        proximity: proximity ?? city.center,
        limit: 5,
      });
      return places.map((place) => ({
        id: place.providerId,
        name: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        cityId: city.id,
      }));
    } catch (error) {
      throwProviderError(error);
    }
  }

  async reverse(request: ReverseRequest): Promise<RiderSearchPlace> {
    const city = await this.requireCity(request.cityId);
    const coordinate = parseCoordinate(request.latitude, request.longitude);
    if (!insideCity(coordinate, city.bounds)) {
      throw new BadRequestException(
        "Location is outside the selected service city",
      );
    }
    try {
      const place = await this.geocodingProvider.reverse(coordinate);
      if (place == null) {
        throw new NotFoundException("No address was found for this location");
      }
      return {
        id: place.providerId,
        name: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        cityId: city.id,
      };
    } catch (error) {
      throwProviderError(error);
    }
  }

  private async requireCity(cityId: string) {
    const city = await this.cityRepository.findActiveById(cityId);
    if (city == null) {
      throw new NotFoundException("City map profile is unavailable");
    }
    return city;
  }
}

function validateQuery(value: unknown): string {
  if (typeof value !== "string") {
    throw new BadRequestException("Search query is required");
  }
  const query = value.trim();
  if (query.length < 2 || query.length > 120) {
    throw new BadRequestException(
      "Search query must be between 2 and 120 characters",
    );
  }
  return query;
}

function parseOptionalProximity(
  latitude: unknown,
  longitude: unknown,
): GeocodingCoordinate | null {
  if (latitude == null && longitude == null) {
    return null;
  }
  if (latitude == null || longitude == null) {
    throw new BadRequestException("Both proximity coordinates are required");
  }
  try {
    return parseCoordinate(latitude, longitude);
  } catch {
    throw new BadRequestException("Proximity coordinates are invalid");
  }
}

function parseCoordinate(latitudeValue: unknown, longitudeValue: unknown) {
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new BadRequestException("Location coordinates are invalid");
  }
  return {latitude, longitude};
}

function insideCity(
  coordinate: GeocodingCoordinate,
  bounds: {west: number; south: number; east: number; north: number},
): boolean {
  return (
    coordinate.longitude >= bounds.west &&
    coordinate.longitude <= bounds.east &&
    coordinate.latitude >= bounds.south &&
    coordinate.latitude <= bounds.north
  );
}

function throwProviderError(error: unknown): never {
  if (error instanceof NotFoundException || error instanceof BadRequestException) {
    throw error;
  }
  if (error instanceof GeocodingProviderException) {
    throw new ServiceUnavailableException(error.message);
  }
  throw error;
}
