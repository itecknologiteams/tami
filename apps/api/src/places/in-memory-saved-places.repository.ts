import { SavedPlacesRepository } from "./saved-places.repository";
import { SaveSavedPlaceForRider, SavedPlace } from "./saved-places.types";

export class InMemorySavedPlacesRepository extends SavedPlacesRepository {
  places: SavedPlace[] = [];

  private placeSequence = 0;

  async listPlacesForRider(riderId: string): Promise<SavedPlace[]> {
    return this.places.filter((place) => place.riderId === riderId);
  }

  async savePlaceForRider(
    input: SaveSavedPlaceForRider,
  ): Promise<SavedPlace | null> {
    if (input.placeId == null) {
      if (input.designation == null) {
        const created = this.createPlace(input);
        this.places.push(created);
        return created;
      }

      const existing = this.places.find(
        (place) =>
          place.riderId === input.riderId && place.designation === input.designation,
      );
      if (existing == null) {
        const created = this.createPlace(input);
        this.places.push(created);
        return created;
      }

      existing.cityId = input.cityId;
      existing.label = input.label;
      existing.address = input.address;
      existing.latitude = input.latitude;
      existing.longitude = input.longitude;
      existing.updatedAt = input.timestamp;
      return existing;
    }

    const index = this.places.findIndex(
      (place) => place.id === input.placeId && place.riderId === input.riderId,
    );
    if (index === -1) {
      return null;
    }

    const existingPlace = this.places[index];
    if (existingPlace == null) {
      return null;
    }

    if (input.designation != null) {
      const conflictingPlace = this.places.find(
        (place) =>
          place.id !== input.placeId &&
          place.riderId === input.riderId &&
          place.designation === input.designation,
      );
      if (conflictingPlace != null) {
        this.places = this.places.filter(
          (place) => place.id !== conflictingPlace.id,
        );
      }
    }

    const updated: SavedPlace = {
      ...existingPlace,
      cityId: input.cityId,
      designation: input.designation,
      label: input.label,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      updatedAt: input.timestamp,
    };
    const updatedIndex = this.places.findIndex(
      (place) => place.id === input.placeId && place.riderId === input.riderId,
    );
    this.places[updatedIndex] = updated;
    return updated;
  }

  async deletePlaceForRider(placeId: string, riderId: string): Promise<boolean> {
    const index = this.places.findIndex(
      (place) => place.id === placeId && place.riderId === riderId,
    );
    if (index === -1) {
      return false;
    }

    this.places.splice(index, 1);
    return true;
  }

  private createPlace(input: SaveSavedPlaceForRider): SavedPlace {
    return {
      id: `place_${++this.placeSequence}`,
      riderId: input.riderId,
      cityId: input.cityId,
      designation: input.designation,
      label: input.label,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      createdAt: input.timestamp,
      updatedAt: input.timestamp,
    };
  }
}
