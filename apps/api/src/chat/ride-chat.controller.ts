import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedRider } from "../auth/auth.types";
import { CurrentRider, RiderAuthGuard } from "../auth/rider-auth.guard";
import { RideChatService } from "./ride-chat.service";
import type { RideChatMessage } from "./ride-chat.types";

@Controller("bookings/rides/:rideId/chat")
@UseGuards(RiderAuthGuard)
export class RideChatController {
  constructor(private readonly rideChatService: RideChatService) {}

  @Get()
  listMessages(
    @CurrentRider() rider: AuthenticatedRider,
    @Param("rideId") rideId: string,
  ): Promise<RideChatMessage[]> {
    return this.rideChatService.listRiderMessages({
      rideId,
      riderId: rider.id,
    });
  }

  @Post()
  sendMessage(
    @CurrentRider() rider: AuthenticatedRider,
    @Param("rideId") rideId: string,
    @Body() body: { message: string },
  ): Promise<RideChatMessage> {
    return this.rideChatService.sendRiderMessage({
      rideId,
      riderId: rider.id,
      body: body.message,
    });
  }
}
