import { RideCategoryCode } from "../bookings/booking.types";
import { PricingPolicy, RiderCategoryCatalog } from "./pricing.types";

export abstract class PricingRepository {
  abstract findAvailableCategories(cityId: string): Promise<RiderCategoryCatalog>;

  abstract findActivePolicy(
    cityId: string,
    categoryCode: RideCategoryCode,
  ): Promise<PricingPolicy | null>;
}
