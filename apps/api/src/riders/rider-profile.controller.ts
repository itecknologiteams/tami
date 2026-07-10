import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import {
  CurrentRider,
  RiderAuthGuard,
} from "../auth/rider-auth.guard";
import { AuthenticatedRider } from "../auth/auth.types";
import {
  RiderProfileService,
  UpdateRiderProfileRequest,
} from "./rider-profile.service";

@Controller("rider")
@UseGuards(RiderAuthGuard)
export class RiderProfileController {
  constructor(private readonly profileService: RiderProfileService) {}

  @Get("me")
  getMe(@CurrentRider() rider: AuthenticatedRider) {
    return this.profileService.getProfile(rider.id);
  }

  @Put("me")
  updateMe(
    @CurrentRider() rider: AuthenticatedRider,
    @Body() request: UpdateRiderProfileRequest,
  ) {
    return this.profileService.updateProfile(rider.id, request);
  }
}
