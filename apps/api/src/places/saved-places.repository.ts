import { SaveSavedPlaceForRider, SavedPlace } from "./saved-places.types";

export abstract class SavedPlacesRepository {
  abstract listPlacesForRider(riderId: string): Promise<SavedPlace[]>;

  abstract savePlaceForRider(
    input: SaveSavedPlaceForRider,
  ): Promise<SavedPlace | null>;

  abstract deletePlaceForRider(
    placeId: string,
    riderId: string,
  ): Promise<boolean>;
}
