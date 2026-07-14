import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminOverviewService } from "./admin-overview.service";
import { AdminTokenGuard } from "./admin-token.guard";

@Controller("admin")
@UseGuards(AdminTokenGuard)
export class AdminOverviewController {
  constructor(private readonly service: AdminOverviewService) {}

  @Get("overview")
  getOverview() {
    return this.service.getOverview();
  }
}
