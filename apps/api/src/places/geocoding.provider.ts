import {
  GeocodingPlace,
  GeocodingReverseRequest,
  GeocodingSearchRequest,
} from "./geocoding.types";

export abstract class GeocodingProvider {
  abstract search(request: GeocodingSearchRequest): Promise<GeocodingPlace[]>;
  abstract reverse(request: GeocodingReverseRequest): Promise<GeocodingPlace | null>;
}
