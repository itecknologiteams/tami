import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedRider } from "../auth/auth.types";
import { CurrentRider, RiderAuthGuard } from "../auth/rider-auth.guard";
import { PricingService } from "./pricing.service";
import {
  FareEstimate,
  FareEstimatePayload,
  RiderCategoryCatalog,
} from "./pricing.types";

@Controller("pricing")
@UseGuards(RiderAuthGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get("categories")
  getAvailableCategories(
    @CurrentRider() rider: AuthenticatedRider,
  ): Promise<RiderCategoryCatalog> {
    return this.pricingService.getAvailableCategories(rider.cityId);
  }

  @Post("estimate")
  estimateFare(
    @CurrentRider() rider: AuthenticatedRider,
    @Body() request: FareEstimatePayload,
  ): Promise<FareEstimate> {
    return this.pricingService.estimateFare({...request, cityId: rider.cityId});
  }
}
