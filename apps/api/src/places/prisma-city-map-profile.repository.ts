import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CityMapProfile,
  CityMapProfileRepository,
} from "./city-map-profile.repository";

@Injectable()
export class PrismaCityMapProfileRepository extends CityMapProfileRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findActiveById(cityId: string): Promise<CityMapProfile | null> {
    const city = await this.prisma.city.findFirst({
      where: {
        id: cityId,
        active: true,
        centerLatitude: {not: null},
        centerLongitude: {not: null},
        searchWest: {not: null},
        searchSouth: {not: null},
        searchEast: {not: null},
        searchNorth: {not: null},
      },
      select: {
        id: true,
        name: true,
        centerLatitude: true,
        centerLongitude: true,
        searchWest: true,
        searchSouth: true,
        searchEast: true,
        searchNorth: true,
      },
    });
    if (
      city == null ||
      city.centerLatitude == null ||
      city.centerLongitude == null ||
      city.searchWest == null ||
      city.searchSouth == null ||
      city.searchEast == null ||
      city.searchNorth == null
    ) {
      return null;
    }
    return {
      id: city.id,
      name: city.name,
      center: {
        latitude: city.centerLatitude.toNumber(),
        longitude: city.centerLongitude.toNumber(),
      },
      bounds: {
        west: city.searchWest.toNumber(),
        south: city.searchSouth.toNumber(),
        east: city.searchEast.toNumber(),
        north: city.searchNorth.toNumber(),
      },
    };
  }
}
