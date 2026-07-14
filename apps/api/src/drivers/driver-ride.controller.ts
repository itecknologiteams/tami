import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentDriver, DriverAuthGuard } from "../auth/driver-auth.guard";
import { AuthenticatedDriver } from "../auth/driver-auth.types";
import { DriverRideChatService } from "./driver-ride-chat.service";
import { DriverRideService } from "./driver-ride.service";

@Controller("driver")
@UseGuards(DriverAuthGuard)
export class DriverRideController {
  constructor(
    private readonly rideService: DriverRideService,
    private readonly chatService: DriverRideChatService,
  ) {}

  @Post("availability")
  updateAvailability(
    @CurrentDriver() driver: AuthenticatedDriver,
    @Body()
    body: {online: unknown; latitude?: unknown; longitude?: unknown},
  ) {
    return this.rideService.updateAvailability(driver, body);
  }

  @Post("location")
  updateLocation(
    @CurrentDriver() driver: AuthenticatedDriver,
    @Body() body: {latitude?: unknown; longitude?: unknown},
  ) {
    return this.rideService.updateLocation(driver, body);
  }

  @Get("rides/current")
  async getCurrentRide(@CurrentDriver() driver: AuthenticatedDriver) {
    const ride = await this.rideService.getCurrentRide(driver);
    return {ride};
  }

  @Get("rides/history")
  getRideHistory(@CurrentDriver() driver: AuthenticatedDriver) {
    return this.rideService.getRideHistory(driver);
  }

  @Get("earnings")
  getEarnings(@CurrentDriver() driver: AuthenticatedDriver) {
    return this.rideService.getEarnings(driver);
  }

  @Get("rides/:rideId/route")
  getRideRoute(
    @CurrentDriver() driver: AuthenticatedDriver,
    @Param("rideId") rideId: string,
  ) {
    return this.rideService.getRideRoute(driver, rideId);
  }

  @Post("rides/:rideId/accept")
  acceptRide(
    @CurrentDriver() driver: AuthenticatedDriver,
    @Param("rideId") rideId: string,
  ) {
    return this.rideService.acceptRide(driver, rideId);
  }

  @Post("rides/:rideId/decline")
  declineRide(
    @CurrentDriver() driver: AuthenticatedDriver,
    @Param("rideId") rideId: string,
  ) {
    return this.rideService.declineRide(driver, rideId);
  }

  @Post("rides/:rideId/advance")
  advanceRide(
    @CurrentDriver() driver: AuthenticatedDriver,
    @Param("rideId") rideId: string,
    @Body() body: {to: unknown},
  ) {
    return this.rideService.advanceRide(driver, rideId, body.to);
  }

  @Post("rides/:rideId/complete")
  completeRide(
    @CurrentDriver() driver: AuthenticatedDriver,
    @Param("rideId") rideId: string,
  ) {
    return this.rideService.completeRide(driver, rideId);
  }

  @Post("rides/:rideId/cancel")
  cancelRide(
    @CurrentDriver() driver: AuthenticatedDriver,
    @Param("rideId") rideId: string,
  ) {
    return this.rideService.cancelRide(driver, rideId);
  }

  @Get("rides/:rideId/chat")
  listChat(
    @CurrentDriver() driver: AuthenticatedDriver,
    @Param("rideId") rideId: string,
  ) {
    return this.chatService.listDriverMessages({rideId, driverId: driver.id});
  }

  @Post("rides/:rideId/chat")
  sendChat(
    @CurrentDriver() driver: AuthenticatedDriver,
    @Param("rideId") rideId: string,
    @Body() body: {body: string},
  ) {
    return this.chatService.sendDriverMessage({
      rideId,
      driverId: driver.id,
      body: body.body ?? "",
    });
  }
}
