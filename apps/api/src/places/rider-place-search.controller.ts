import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedRider } from "../auth/auth.types";
import { CurrentRider, RiderAuthGuard } from "../auth/rider-auth.guard";
import { RiderSearchPlace } from "./geocoding.types";
import { RiderPlaceSearchService } from "./rider-place-search.service";

@Controller("places")
@UseGuards(RiderAuthGuard)
export class RiderPlaceSearchController {
  constructor(private readonly service: RiderPlaceSearchService) {}

  @Get("search")
  searchPlaces(
    @CurrentRider() rider: AuthenticatedRider,
    @Query("query") query: string,
    @Query("proximityLatitude") proximityLatitude?: string,
    @Query("proximityLongitude") proximityLongitude?: string,
  ): Promise<RiderSearchPlace[]> {
    return this.service.search({
      cityId: rider.cityId,
      query,
      proximityLatitude,
      proximityLongitude,
    });
  }

  @Get("reverse")
  reversePlace(
    @CurrentRider() rider: AuthenticatedRider,
    @Query("latitude") latitude: string,
    @Query("longitude") longitude: string,
  ): Promise<RiderSearchPlace> {
    return this.service.reverse({cityId: rider.cityId, latitude, longitude});
  }
}
