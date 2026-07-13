import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedRider } from "../auth/auth.types";
import { CurrentRider, RiderAuthGuard } from "../auth/rider-auth.guard";
import { PricingService } from "./pricing.service";
import { FareEstimate, FareEstimatePayload } from "./pricing.types";

@Controller("pricing")
@UseGuards(RiderAuthGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post("estimate")
  estimateFare(
    @CurrentRider() rider: AuthenticatedRider,
    @Body() request: FareEstimatePayload,
  ): Promise<FareEstimate> {
    return this.pricingService.estimateFare({...request, cityId: rider.cityId});
  }
}
