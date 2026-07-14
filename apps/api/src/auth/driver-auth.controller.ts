import { Body, Controller, Post } from "@nestjs/common";
import { DriverAuthService } from "./driver-auth.service";
import { VerifyDriverRequest } from "./driver-auth.types";

@Controller("auth/driver")
export class DriverAuthController {
  constructor(private readonly authService: DriverAuthService) {}

  @Post("otp")
  requestOtp(@Body() request: { phone: string }) {
    return this.authService.requestOtp(request.phone);
  }

  @Post("verify")
  verifyDriver(@Body() request: VerifyDriverRequest) {
    return this.authService.verifyDriver(request);
  }
}
