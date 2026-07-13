export type MapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type GeocodingCoordinate = {
  latitude: number;
  longitude: number;
};

export type GeocodingPlace = GeocodingCoordinate & {
  providerId: string;
  name: string;
  address: string;
};

export type GeocodingSearchRequest = {
  query: string;
  bounds: MapBounds;
  proximity?: GeocodingCoordinate;
  limit: number;
};

export type GeocodingReverseRequest = GeocodingCoordinate;

export type RiderSearchPlace = GeocodingCoordinate & {
  id: string;
  name: string;
  address: string;
  cityId: string;
};

export class GeocodingProviderException extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "GeocodingProviderException";
  }
}
