import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SavedPlacesRepository } from "./saved-places.repository";
import { SaveSavedPlaceForRider, SavedPlace } from "./saved-places.types";

type PersistedSavedPlace = Prisma.SavedPlaceGetPayload<Record<string, never>>;

function toNumber(value: { toNumber(): number } | number): number {
  return typeof value === "number" ? value : value.toNumber();
}

function toSavedPlace(place: PersistedSavedPlace): SavedPlace {
  return {
    id: place.id,
    riderId: place.riderId,
    cityId: place.cityId,
    designation: place.designation,
    label: place.label,
    address: place.address,
    latitude: toNumber(place.latitude),
    longitude: toNumber(place.longitude),
    createdAt: place.createdAt.toISOString(),
    updatedAt: place.updatedAt.toISOString(),
  };
}

@Injectable()
export class PrismaSavedPlacesRepository extends SavedPlacesRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listPlacesForRider(riderId: string): Promise<SavedPlace[]> {
    const places = await this.prisma.savedPlace.findMany({
      where: { riderId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return places.map(toSavedPlace);
  }

  async savePlaceForRider(
    input: SaveSavedPlaceForRider,
  ): Promise<SavedPlace | null> {
    const timestamp = new Date(input.timestamp);

    if (input.placeId == null) {
      if (input.designation == null) {
        const place = await this.prisma.savedPlace.create({
          data: {
            riderId: input.riderId,
            cityId: input.cityId,
            designation: null,
            label: input.label,
            address: input.address,
            latitude: input.latitude,
            longitude: input.longitude,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        });
        return toSavedPlace(place);
      }

      const place = await this.prisma.savedPlace.upsert({
        where: {
          riderId_designation: {
            riderId: input.riderId,
            designation: input.designation,
          },
        },
        update: {
          cityId: input.cityId,
          label: input.label,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          updatedAt: timestamp,
        },
        create: {
          riderId: input.riderId,
          cityId: input.cityId,
          designation: input.designation,
          label: input.label,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });
      return toSavedPlace(place);
    }

    const placeId = input.placeId;

    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.savedPlace.findFirst({
        where: {
          id: placeId,
          riderId: input.riderId,
        },
      });
      if (existing == null) {
        return null;
      }

      if (input.designation != null) {
        const conflictingPlace = await transaction.savedPlace.findFirst({
          where: {
            riderId: input.riderId,
            designation: input.designation,
            NOT: { id: placeId },
          },
        });
        if (conflictingPlace != null) {
          await transaction.savedPlace.delete({
            where: { id: conflictingPlace.id },
          });
        }
      }

      const place = await transaction.savedPlace.update({
        where: { id: placeId },
        data: {
          cityId: input.cityId,
          designation: input.designation,
          label: input.label,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          updatedAt: timestamp,
        },
      });
      return toSavedPlace(place);
    });
  }

  async deletePlaceForRider(placeId: string, riderId: string): Promise<boolean> {
    const result = await this.prisma.savedPlace.deleteMany({
      where: {
        id: placeId,
        riderId,
      },
    });
    return result.count > 0;
  }
}
