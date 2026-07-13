import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { RideCategoryCode } from "../bookings/booking.types";
import { PrismaService } from "../prisma/prisma.service";
import { PricingRepository } from "./pricing.repository";
import { PricingPolicy } from "./pricing.types";

type PersistedPolicy = Prisma.FarePolicyGetPayload<{
  include: {categoryRates: true};
}>;

@Injectable()
export class PrismaPricingRepository extends PricingRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findActiveCategory(categoryCode: RideCategoryCode) {
    return this.prisma.rideCategory.findFirst({
      where: {code: categoryCode, active: true},
      select: {code: true},
    });
  }

  async findActivePolicyForCity(cityId: string, now = new Date()) {
    const policies = await this.prisma.farePolicy.findMany({
      where: {cityId, active: true, effectiveFrom: {lte: now}},
      include: {categoryRates: true},
      orderBy: [{version: "desc"}, {id: "desc"}],
      take: 2,
    });
    if (policies.length > 1) {
      throw new Error(`Expected at most one active fare policy for city ${cityId}`);
    }
    const policy = policies[0];
    return policy == null ? null : toPolicyRecord(policy);
  }

  async findActivePolicy(
    cityId: string,
    categoryCode: RideCategoryCode,
  ): Promise<PricingPolicy | null> {
    const [category, policy] = await Promise.all([
      this.findActiveCategory(categoryCode),
      this.findActivePolicyForCity(cityId),
    ]);
    if (category == null || policy == null) {
      return null;
    }
    const categoryMultiplier = policy.categoryRates[categoryCode];
    if (categoryMultiplier == null) {
      return null;
    }
    return {
      id: policy.id,
      cityId: policy.cityId,
      version: policy.version,
      currency: policy.currency,
      baseFareMinor: policy.baseFareMinor,
      perKilometerMinor: policy.perKilometerMinor,
      perMinuteMinor: policy.perMinuteMinor,
      bookingFeeMinor: policy.bookingFeeMinor,
      minimumFareMinor: policy.minimumFareMinor,
      demandMultiplier: policy.demandMultiplier,
      maximumMultiplier: policy.maximumMultiplier,
      maximumFareMinor: policy.maximumFareMinor,
      roadFactor: policy.roadFactor,
      averageSpeedKph: policy.averageSpeedKph,
      categoryMultiplier,
    };
  }
}

function toPolicyRecord(policy: PersistedPolicy) {
  return {
    id: policy.id,
    cityId: policy.cityId,
    version: policy.version,
    name: policy.name,
    active: policy.active,
    currency: policy.currency,
    baseFareMinor: policy.baseFareMinor,
    perKilometerMinor: policy.perKilometerMinor,
    perMinuteMinor: policy.perMinuteMinor,
    bookingFeeMinor: policy.bookingFeeMinor,
    minimumFareMinor: policy.minimumFareMinor,
    demandMultiplier: policy.demandMultiplier.toNumber(),
    maximumMultiplier: policy.maximumMultiplier.toNumber(),
    maximumFareMinor: policy.maximumFareMinor,
    roadFactor: policy.roadFactor.toNumber(),
    averageSpeedKph: policy.averageSpeedKph,
    effectiveFrom: policy.effectiveFrom.toISOString(),
    categoryRates: Object.fromEntries(
      policy.categoryRates.map((rate) => [
        rate.categoryCode,
        rate.multiplier.toNumber(),
      ]),
    ) as Partial<Record<RideCategoryCode, number>>,
  };
}
