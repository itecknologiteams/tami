import { RideCategoryCode } from "../bookings/booking.types";
import { PricingPolicy } from "./pricing.types";

export abstract class PricingRepository {
  abstract findActivePolicy(
    cityId: string,
    categoryCode: RideCategoryCode,
  ): Promise<PricingPolicy | null>;
}
