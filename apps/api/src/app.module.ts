import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { RideTransitionService } from "./rides/ride-transition.service";

@Module({
  controllers: [HealthController],
  providers: [RideTransitionService],
})
export class AppModule {}
