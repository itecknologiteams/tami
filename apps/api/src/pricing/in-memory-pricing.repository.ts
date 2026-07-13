import { RideCategoryCode } from "../bookings/booking.types";
import { PricingRepository } from "./pricing.repository";
import { PricingPolicy } from "./pricing.types";

export class InMemoryPricingRepository extends PricingRepository {
  constructor(private readonly policies: PricingPolicy[]) {
    super();
  }

  async findActivePolicy(
    cityId: string,
    _categoryCode: RideCategoryCode,
  ): Promise<PricingPolicy | null> {
    return this.policies.find((policy) => policy.cityId === cityId) ?? null;
  }
}
