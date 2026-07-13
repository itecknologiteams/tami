import { RideCategoryCode } from "../bookings/booking.types";
import { PricingRepository } from "./pricing.repository";
import { PricingPolicy, RiderCategoryCatalog } from "./pricing.types";

export class InMemoryPricingRepository extends PricingRepository {
  constructor(
    private readonly policies: PricingPolicy[],
    private readonly catalog: RiderCategoryCatalog = {
      categories: [
        {
          code: "standard_taxi",
          name: "Standard Taxi",
          description: "General Tami taxi rides.",
        },
      ],
      scheduledRidesEnabled: true,
    },
  ) {
    super();
  }

  async findAvailableCategories(cityId: string): Promise<RiderCategoryCatalog> {
    return this.policies.some((policy) => policy.cityId === cityId)
      ? this.catalog
      : {categories: [], scheduledRidesEnabled: false};
  }

  async findActivePolicy(
    cityId: string,
    _categoryCode: RideCategoryCode,
  ): Promise<PricingPolicy | null> {
    return this.policies.find((policy) => policy.cityId === cityId) ?? null;
  }
}
