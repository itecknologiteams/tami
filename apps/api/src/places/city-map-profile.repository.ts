import { GeocodingCoordinate, MapBounds } from "./geocoding.types";

export type CityMapProfile = {
  id: string;
  name: string;
  center: GeocodingCoordinate;
  bounds: MapBounds;
};

export abstract class CityMapProfileRepository {
  abstract findActiveById(cityId: string): Promise<CityMapProfile | null>;
}
