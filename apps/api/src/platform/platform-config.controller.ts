import { Controller, Get } from "@nestjs/common";
import {
  PlatformConfig,
  PlatformConfigService,
} from "./platform-config.service";

@Controller("platform")
export class PlatformConfigController {
  constructor(private readonly platformConfigService: PlatformConfigService) {}

  @Get("config")
  getConfig(): PlatformConfig {
    return this.platformConfigService.getConfig();
  }
}
