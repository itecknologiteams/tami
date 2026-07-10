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
import { HealthController } from "./health/health.controller";
import { PlatformConfigController } from "./platform/platform-config.controller";
import { PlatformConfigService } from "./platform/platform-config.service";
import { PrismaService } from "./prisma/prisma.service";
import { RiderProfileController } from "./riders/rider-profile.controller";
import { RiderProfileService } from "./riders/rider-profile.service";
import { RideTransitionService } from "./rides/ride-transition.service";

@Module({
  controllers: [
    HealthController,
    PlatformConfigController,
    BookingController,
    AuthController,
    RiderProfileController,
  ],
  providers: [
    RideTransitionService,
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
    {
      provide: BookingRepository,
      useClass: PrismaBookingRepository,
    },
  ],
})
export class AppModule {}
