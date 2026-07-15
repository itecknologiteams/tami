import { Module } from "@nestjs/common";
import { AdminOverviewController } from "./admin/admin-overview.controller";
import { AdminOverviewRepository } from "./admin/admin-overview.repository";
import { AdminOverviewService } from "./admin/admin-overview.service";
import {
  ADMIN_TOKEN,
  AdminTokenGuard,
  createAdminToken,
} from "./admin/admin-token.guard";
import { PrismaAdminOverviewRepository } from "./admin/prisma-admin-overview.repository";
import { AuthController } from "./auth/auth.controller";
import { AuthRepository } from "./auth/auth.repository";
import { AuthService } from "./auth/auth.service";
import { DriverAuthController } from "./auth/driver-auth.controller";
import { DriverAuthGuard } from "./auth/driver-auth.guard";
import { DriverAuthRepository } from "./auth/driver-auth.repository";
import { DriverAuthService } from "./auth/driver-auth.service";
import { OtpRateLimiter } from "./auth/otp-rate-limiter";
import { OtpService } from "./auth/otp.service";
import { PrismaAuthRepository } from "./auth/prisma-auth.repository";
import { PrismaDriverAuthRepository } from "./auth/prisma-driver-auth.repository";
import { RiderAuthGuard } from "./auth/rider-auth.guard";
import { BookingController } from "./bookings/booking.controller";
import { BookingRepository } from "./bookings/booking.repository";
import { BookingService } from "./bookings/booking.service";
import { PrismaBookingRepository } from "./bookings/prisma-booking.repository";
import { PrismaRideChatRepository } from "./chat/prisma-ride-chat.repository";
import { DriverRideChatService } from "./drivers/driver-ride-chat.service";
import { DriverRideController } from "./drivers/driver-ride.controller";
import { DriverRideRepository } from "./drivers/driver-ride.repository";
import { DriverRideService } from "./drivers/driver-ride.service";
import { PrismaDriverRideRepository } from "./drivers/prisma-driver-ride.repository";
import { RideChatController } from "./chat/ride-chat.controller";
import { RideChatRepository } from "./chat/ride-chat.repository";
import { RideChatService } from "./chat/ride-chat.service";
import { HealthController } from "./health/health.controller";
import { DevelopmentPushNotificationProvider } from "./notifications/development-push-notification.provider";
import { FcmPushNotificationProvider } from "./notifications/fcm-push-notification.provider";
import { PushNotificationProvider } from "./notifications/push-notification.provider";
import { PlatformConfigController } from "./platform/platform-config.controller";
import { PlatformConfigService } from "./platform/platform-config.service";
import { PrismaSavedPlacesRepository } from "./places/prisma-saved-places.repository";
import { CityMapProfileRepository } from "./places/city-map-profile.repository";
import { DevelopmentGeocodingProvider } from "./places/development-geocoding.provider";
import { GeocodingProvider } from "./places/geocoding.provider";
import { MapTilerGeocodingProvider } from "./places/maptiler-geocoding.provider";
import { NominatimGeocodingProvider } from "./places/nominatim-geocoding.provider";
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
import {
  DriverRealtimeGateway,
  RealtimeAuthHandshake,
  RiderRealtimeGateway,
} from "./realtime/realtime.gateway";
import { RealtimeEventBus } from "./realtime/realtime-event-bus";
import { REDIS_CLIENT, createRedisClient } from "./redis/redis-client.provider";
import { RiderProfileController } from "./riders/rider-profile.controller";
import { RiderProfileService } from "./riders/rider-profile.service";
import { OsrmRoutingProvider } from "./routing/osrm-routing.provider";
import { RoutingProvider } from "./routing/routing.provider";
import { RoutingService } from "./routing/routing.service";
import { RideTransitionService } from "./rides/ride-transition.service";
import { RiderRideQueryController } from "./rides/rider-ride-query.controller";
import { RiderRideQueryService } from "./rides/rider-ride-query.service";
import { DevelopmentSmsProvider } from "./sms/development-sms.provider";
import { SmsProvider } from "./sms/sms.provider";
import { TwilioSmsProvider } from "./sms/twilio-sms.provider";

@Module({
  controllers: [
    HealthController,
    PlatformConfigController,
    BookingController,
    AuthController,
    DriverAuthController,
    DriverRideController,
    RiderProfileController,
    RideChatController,
    RiderRideQueryController,
    SavedPlacesController,
    RiderPlaceSearchController,
    PricingController,
    AdminOverviewController,
  ],
  providers: [
    RideTransitionService,
    RiderRideQueryService,
    PlatformConfigService,
    PrismaService,
    OtpService,
    OtpRateLimiter,
    {
      provide: REDIS_CLIENT,
      useFactory: createRedisClient,
    },
    {
      provide: SmsProvider,
      useFactory: createSmsProvider,
    },
    AuthService,
    RiderAuthGuard,
    DriverAuthService,
    DriverAuthGuard,
    RiderProfileService,
    {
      provide: AuthRepository,
      useClass: PrismaAuthRepository,
    },
    {
      provide: DriverAuthRepository,
      useClass: PrismaDriverAuthRepository,
    },
    BookingService,
    RideChatService,
    DriverRideService,
    DriverRideChatService,
    {
      provide: DriverRideRepository,
      useClass: PrismaDriverRideRepository,
    },
    SavedPlacesService,
    RiderPlaceSearchService,
    PricingService,
    RoutingService,
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
    {
      provide: RoutingProvider,
      useFactory: createRoutingProvider,
    },
    AdminOverviewService,
    AdminTokenGuard,
    {
      provide: ADMIN_TOKEN,
      useFactory: createAdminToken,
    },
    {
      provide: AdminOverviewRepository,
      useClass: PrismaAdminOverviewRepository,
    },
    RealtimeEventBus,
    RealtimeAuthHandshake,
    RiderRealtimeGateway,
    DriverRealtimeGateway,
    {
      provide: PushNotificationProvider,
      useFactory: createPushNotificationProvider,
    },
  ],
})
export class AppModule {}

function createGeocodingProvider(): GeocodingProvider {
  const nominatimBaseUrl = process.env.TAMI_NOMINATIM_BASE_URL?.trim();
  if (nominatimBaseUrl) {
    return new NominatimGeocodingProvider({baseUrl: nominatimBaseUrl});
  }
  const apiKey = process.env.TAMI_MAPTILER_API_KEY?.trim();
  if (apiKey) {
    return new MapTilerGeocodingProvider({apiKey});
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("TAMI_NOMINATIM_BASE_URL is required in production");
  }
  return new DevelopmentGeocodingProvider();
}

function createRoutingProvider(): RoutingProvider {
  const configuredBaseUrl = process.env.TAMI_ROUTING_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return new OsrmRoutingProvider({baseUrl: configuredBaseUrl});
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("TAMI_ROUTING_BASE_URL is required in production");
  }
  return new OsrmRoutingProvider({baseUrl: "https://router.project-osrm.org"});
}

function createPushNotificationProvider(): PushNotificationProvider {
  const serverKey = process.env.TAMI_FCM_SERVER_KEY?.trim();
  if (serverKey) {
    return new FcmPushNotificationProvider({serverKey});
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("TAMI_FCM_SERVER_KEY is required in production");
  }
  return new DevelopmentPushNotificationProvider();
}

function createSmsProvider(): SmsProvider {
  const accountSid = process.env.TAMI_TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TAMI_TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TAMI_TWILIO_FROM_NUMBER?.trim();
  if (accountSid && authToken && fromNumber) {
    return new TwilioSmsProvider({accountSid, authToken, fromNumber});
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "TAMI_TWILIO_ACCOUNT_SID, TAMI_TWILIO_AUTH_TOKEN, and TAMI_TWILIO_FROM_NUMBER are required in production",
    );
  }
  return new DevelopmentSmsProvider();
}
