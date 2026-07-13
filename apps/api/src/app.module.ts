import { Module } from "@nestjs/common";
import { AuthController } from "./auth/auth.controller";
import { AuthRepository } from "./auth/auth.repository";
import { AuthService } from "./auth/auth.service";
import { DevelopmentOtpStore } from "./auth/development-otp-store";
import { PrismaAuthRepository } from "./auth/prisma-auth.repository";
import { RiderAuthGuard } from "./auth/rider-auth.guard";
import { BookingController } from "./bookings/booking.controller";
import { BookingRepository } from "./bookings/booking.repository";
import { BookingService } from "./bookings/booking.service";
import { PrismaBookingRepository } from "./bookings/prisma-booking.repository";
import { PrismaRideChatRepository } from "./chat/prisma-ride-chat.repository";
import { RideChatController } from "./chat/ride-chat.controller";
import { RideChatRepository } from "./chat/ride-chat.repository";
import { RideChatService } from "./chat/ride-chat.service";
import { HealthController } from "./health/health.controller";
import { PlatformConfigController } from "./platform/platform-config.controller";
import { PlatformConfigService } from "./platform/platform-config.service";
import { PrismaSavedPlacesRepository } from "./places/prisma-saved-places.repository";
import { CityMapProfileRepository } from "./places/city-map-profile.repository";
import { DevelopmentGeocodingProvider } from "./places/development-geocoding.provider";
import { GeocodingProvider } from "./places/geocoding.provider";
import { MapTilerGeocodingProvider } from "./places/maptiler-geocoding.provider";
import { PrismaCityMapProfileRepository } from "./places/prisma-city-map-profile.repository";
import { RiderPlaceSearchController } from "./places/rider-place-search.controller";
import { RiderPlaceSearchService } from "./places/rider-place-search.service";
import { SavedPlacesController } from "./places/saved-places.controller";
import { SavedPlacesRepository } from "./places/saved-places.repository";
import { SavedPlacesService } from "./places/saved-places.service";
import { PrismaService } from "./prisma/prisma.service";
import { PricingController } from "./pricing/pricing.controller";
import { PrismaPricingRepository } from "./pricing/prisma-pricing.repository";
import { PricingRepository } from "./pricing/pricing.repository";
import { PricingService } from "./pricing/pricing.service";
import { RiderProfileController } from "./riders/rider-profile.controller";
import { RiderProfileService } from "./riders/rider-profile.service";
import { RideTransitionService } from "./rides/ride-transition.service";
import { RiderRideQueryController } from "./rides/rider-ride-query.controller";
import { RiderRideQueryService } from "./rides/rider-ride-query.service";

@Module({
  controllers: [
    HealthController,
    PlatformConfigController,
    BookingController,
    AuthController,
    RiderProfileController,
    RideChatController,
    RiderRideQueryController,
    SavedPlacesController,
    RiderPlaceSearchController,
    PricingController,
  ],
  providers: [
    RideTransitionService,
    RiderRideQueryService,
    PlatformConfigService,
    PrismaService,
    DevelopmentOtpStore,
    AuthService,
    RiderAuthGuard,
    RiderProfileService,
    {
      provide: AuthRepository,
      useClass: PrismaAuthRepository,
    },
    BookingService,
    RideChatService,
    SavedPlacesService,
    RiderPlaceSearchService,
    PricingService,
    {
      provide: BookingRepository,
      useClass: PrismaBookingRepository,
    },
    {
      provide: RideChatRepository,
      useClass: PrismaRideChatRepository,
    },
    {
      provide: SavedPlacesRepository,
      useClass: PrismaSavedPlacesRepository,
    },
    {
      provide: CityMapProfileRepository,
      useClass: PrismaCityMapProfileRepository,
    },
    {
      provide: GeocodingProvider,
      useFactory: createGeocodingProvider,
    },
    {
      provide: PricingRepository,
      useClass: PrismaPricingRepository,
    },
  ],
})
export class AppModule {}

function createGeocodingProvider(): GeocodingProvider {
  const apiKey = process.env.TAMI_MAPTILER_API_KEY?.trim();
  if (apiKey) {
    return new MapTilerGeocodingProvider({apiKey});
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("TAMI_MAPTILER_API_KEY is required in production");
  }
  return new DevelopmentGeocodingProvider();
}
