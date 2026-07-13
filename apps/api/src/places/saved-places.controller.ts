import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { AuthenticatedRider } from "../auth/auth.types";
import { CurrentRider, RiderAuthGuard } from "../auth/rider-auth.guard";
import { SavedPlacesService } from "./saved-places.service";
import { SavedPlace, SavedPlacePayload } from "./saved-places.types";

@Controller("rider/places")
@UseGuards(RiderAuthGuard)
export class SavedPlacesController {
  constructor(private readonly savedPlacesService: SavedPlacesService) {}

  @Get()
  listPlaces(@CurrentRider() rider: AuthenticatedRider): Promise<SavedPlace[]> {
    return this.savedPlacesService.listPlaces(rider.id);
  }

  @Post()
  createPlace(
    @CurrentRider() rider: AuthenticatedRider,
    @Body() request: SavedPlacePayload,
  ): Promise<SavedPlace> {
    return this.savedPlacesService.createPlace({
      ...request,
      riderId: rider.id,
      cityId: rider.cityId,
    });
  }

  @Put(":placeId")
  updatePlace(
    @CurrentRider() rider: AuthenticatedRider,
    @Param("placeId") placeId: string,
    @Body() request: SavedPlacePayload,
  ): Promise<SavedPlace> {
    return this.savedPlacesService.updatePlace({
      placeId,
      ...request,
      riderId: rider.id,
      cityId: rider.cityId,
    });
  }

  @Delete(":placeId")
  deletePlace(
    @CurrentRider() rider: AuthenticatedRider,
    @Param("placeId") placeId: string,
  ): Promise<void> {
    return this.savedPlacesService.deletePlace({
      placeId,
      riderId: rider.id,
    });
  }
}
