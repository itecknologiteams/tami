import { GeocodingProvider } from "./geocoding.provider";
import {
  GeocodingPlace,
  GeocodingReverseRequest,
  GeocodingSearchRequest,
} from "./geocoding.types";

const developmentPlaces: GeocodingPlace[] = [
  place("karachi-mazar", "Mazar-e-Quaid", "Mazar-e-Quaid, Karachi", 24.8753, 67.0407),
  place("karachi-frere", "Frere Hall", "Civil Lines, Karachi", 24.8468, 67.0303),
  place("karachi-clifton", "Clifton Beach", "Clifton, Karachi", 24.8138, 67.0307),
  place("karachi-airport", "Jinnah International Airport", "Airport Road, Karachi", 24.9065, 67.1608),
  place("hyderabad-station", "Hyderabad Railway Station", "Station Road, Hyderabad", 25.3791, 68.3728),
  place("hyderabad-rani-bagh", "Rani Bagh", "Qasimabad, Hyderabad", 25.3935, 68.3544),
  place("sukkur-barrage", "Sukkur Barrage", "Sukkur Barrage, Sukkur", 27.6804, 68.8452),
  place("sukkur-station", "Sukkur Railway Station", "Station Road, Sukkur", 27.7046, 68.8574),
  place("larkana-station", "Larkana Railway Station", "Station Road, Larkana", 27.5589, 68.207),
  place("larkana-jinnah-bagh", "Jinnah Bagh", "Jinnah Bagh, Larkana", 27.5581, 68.2153),
  place("mirpur-station", "Mirpur Khas Railway Station", "Station Road, Mirpur Khas", 25.5264, 69.0126),
  place("mirpur-satellite", "Satellite Town", "Satellite Town, Mirpur Khas", 25.5152, 69.0242),
];

export class DevelopmentGeocodingProvider extends GeocodingProvider {
  async search(request: GeocodingSearchRequest): Promise<GeocodingPlace[]> {
    const query = request.query.toLowerCase();
    return developmentPlaces
      .filter((candidate) => inside(candidate, request.bounds))
      .filter(
        (candidate) =>
          candidate.name.toLowerCase().includes(query) ||
          candidate.address.toLowerCase().includes(query),
      )
      .slice(0, request.limit);
  }

  async reverse(request: GeocodingReverseRequest): Promise<GeocodingPlace | null> {
    const nearest = developmentPlaces
      .map((candidate) => ({
        candidate,
        delta:
          (candidate.latitude - request.latitude) ** 2 +
          (candidate.longitude - request.longitude) ** 2,
      }))
      .sort((left, right) => left.delta - right.delta)[0];
    if (nearest == null || nearest.delta > 0.01) {
      return {
        providerId: `development-${request.longitude}-${request.latitude}`,
        name: "Current location",
        address: "Current location",
        ...request,
      };
    }
    return nearest.candidate;
  }
}

function place(
  providerId: string,
  name: string,
  address: string,
  latitude: number,
  longitude: number,
): GeocodingPlace {
  return {providerId, name, address, latitude, longitude};
}

function inside(
  coordinate: GeocodingReverseRequest,
  bounds: GeocodingSearchRequest["bounds"],
): boolean {
  return (
    coordinate.longitude >= bounds.west &&
    coordinate.longitude <= bounds.east &&
    coordinate.latitude >= bounds.south &&
    coordinate.latitude <= bounds.north
  );
}
