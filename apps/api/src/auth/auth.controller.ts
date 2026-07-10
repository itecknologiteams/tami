import { Body, Controller, Get, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { VerifyRiderRequest } from "./auth.types";

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
}
