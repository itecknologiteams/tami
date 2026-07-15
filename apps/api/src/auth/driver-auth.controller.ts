import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { DriverAuthService } from "./driver-auth.service";
import { AuthenticatedDriver, VerifyDriverRequest } from "./driver-auth.types";
import { CurrentDriver, DriverAuthGuard } from "./driver-auth.guard";

@Controller("auth/driver")
export class DriverAuthController {
  constructor(private readonly authService: DriverAuthService) {}

  @Post("otp")
  async requestOtp(@Body() request: { phone: string }) {
    const challenge = await this.authService.requestOtp(request.phone);
    if (process.env.NODE_ENV === "production") {
      return { challengeId: challenge.challengeId, expiresAt: challenge.expiresAt };
    }
    return challenge;
  }

  @Post("verify")
  verifyDriver(@Body() request: VerifyDriverRequest) {
    return this.authService.verifyDriver(request);
  }

  @Post("device-token")
  @UseGuards(DriverAuthGuard)
  registerDeviceToken(
    @CurrentDriver() driver: AuthenticatedDriver,
    @Body() request: { deviceToken: string },
  ) {
    return this.authService.registerDeviceToken(driver.id, request.deviceToken);
  }
}
