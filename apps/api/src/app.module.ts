import { Module } from "@nestjs/common";
import { BookingController } from "./bookings/booking.controller";
import { BookingRepository } from "./bookings/booking.repository";
import { BookingService } from "./bookings/booking.service";
import { PrismaBookingRepository } from "./bookings/prisma-booking.repository";
import { HealthController } from "./health/health.controller";
import { PlatformConfigController } from "./platform/platform-config.controller";
import { PlatformConfigService } from "./platform/platform-config.service";
import { PrismaService } from "./prisma/prisma.service";
import { RideTransitionService } from "./rides/ride-transition.service";

@Module({
  controllers: [HealthController, PlatformConfigController, BookingController],
  providers: [
    RideTransitionService,
    PlatformConfigService,
    PrismaService,
    BookingService,
    {
      provide: BookingRepository,
      useClass: PrismaBookingRepository,
    },
  ],
})
export class AppModule {}
