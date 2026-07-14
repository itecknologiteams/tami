import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthenticatedRider, VerifyRiderRequest } from "./auth.types";
import { CurrentRider, RiderAuthGuard } from "./rider-auth.guard";

@Controller("auth/rider")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("cities")
  getActiveCities() {
    return this.authService.getActiveCities();
  }

  @Post("otp")
  requestOtp(@Body() request: { phone: string }) {
    return this.authService.requestOtp(request.phone);
  }

  @Post("verify")
  verifyRider(@Body() request: VerifyRiderRequest) {
    return this.authService.verifyRider(request);
  }

  @Post("device-token")
  @UseGuards(RiderAuthGuard)
  registerDeviceToken(
    @CurrentRider() rider: AuthenticatedRider,
    @Body() request: { deviceToken: string },
  ) {
    return this.authService.registerDeviceToken(rider.id, request.deviceToken);
  }
}
