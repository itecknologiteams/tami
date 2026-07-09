import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { PlatformConfigController } from "./platform/platform-config.controller";
import { PlatformConfigService } from "./platform/platform-config.service";
import { RideTransitionService } from "./rides/ride-transition.service";

@Module({
  controllers: [HealthController, PlatformConfigController],
  providers: [RideTransitionService, PlatformConfigService],
})
export class AppModule {}
