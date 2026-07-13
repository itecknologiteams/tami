import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SavedPlacesRepository } from "./saved-places.repository";
import {
  SavedPlace,
  SavedPlaceDesignation,
  SavedPlacePayload,
} from "./saved-places.types";

@Injectable()
export class SavedPlacesService {
  constructor(private readonly repository: SavedPlacesRepository) {}

  listPlaces(riderId: string): Promise<SavedPlace[]> {
    return this.repository.listPlacesForRider(riderId);
  }

  async createPlace(input: {
    riderId: string;
    cityId: string;
  } & SavedPlacePayload): Promise<SavedPlace> {
    const request = this.validatePayload(input);
    const place = await this.repository.savePlaceForRider({
      riderId: input.riderId,
      cityId: input.cityId,
      designation: request.designation,
      label: request.label,
      address: request.address,
      latitude: request.latitude,
      longitude: request.longitude,
      timestamp: new Date().toISOString(),
    });
    if (place == null) {
      throw new NotFoundException("Saved place not found");
    }
    return place;
  }

  async updatePlace(input: {
    placeId: string;
    riderId: string;
    cityId: string;
  } & SavedPlacePayload): Promise<SavedPlace> {
    const request = this.validatePayload(input);
    const place = await this.repository.savePlaceForRider({
      placeId: input.placeId,
      riderId: input.riderId,
      cityId: input.cityId,
      designation: request.designation,
      label: request.label,
      address: request.address,
      latitude: request.latitude,
      longitude: request.longitude,
      timestamp: new Date().toISOString(),
    });

    if (place == null) {
      throw new NotFoundException("Saved place not found");
    }

    return place;
  }

  async deletePlace(input: {
    placeId: string;
    riderId: string;
  }): Promise<void> {
    const deleted = await this.repository.deletePlaceForRider(
      input.placeId,
      input.riderId,
    );
    if (!deleted) {
      throw new NotFoundException("Saved place not found");
    }
  }

  private validatePayload(input: SavedPlacePayload): {
    designation: SavedPlaceDesignation | null;
    label: string;
    address: string;
    latitude: number;
    longitude: number;
  } {
    const designation = input.designation ?? null;
    if (designation !== null && designation !== "home" && designation !== "work") {
      throw new BadRequestException("Designation must be home or work");
    }

    const label = this.requireTrimmedString(input.label, "Label cannot be empty");
    if (label.length === 0) {
      throw new BadRequestException("Label cannot be empty");
    }

    const address = this.requireTrimmedString(
      input.address,
      "Address cannot be empty",
    );
    if (address.length === 0) {
      throw new BadRequestException("Address cannot be empty");
    }

    if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
      throw new BadRequestException("Latitude must be between -90 and 90");
    }

    if (
      !Number.isFinite(input.longitude) ||
      input.longitude < -180 ||
      input.longitude > 180
    ) {
      throw new BadRequestException("Longitude must be between -180 and 180");
    }

    return {
      designation,
      label,
      address,
      latitude: input.latitude,
      longitude: input.longitude,
    };
  }

  private requireTrimmedString(value: unknown, message: string): string {
    if (typeof value !== "string") {
      throw new BadRequestException(message);
    }

    return value.trim();
  }
}
