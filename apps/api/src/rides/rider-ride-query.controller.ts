import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthenticatedRider } from "../auth/auth.types";
import { CurrentRider, RiderAuthGuard } from "../auth/rider-auth.guard";
import { BookingRide, BookingRidePage } from "../bookings/booking.types";
import { RiderRideQueryService } from "./rider-ride-query.service";

@Controller("rides")
@UseGuards(RiderAuthGuard)
export class RiderRideQueryController {
  constructor(private readonly rides: RiderRideQueryService) {}

  @Get("current")
  getCurrent(@CurrentRider() rider: AuthenticatedRider): Promise<BookingRide | null> {
    return this.rides.getCurrentRide(rider.id);
  }

  @Get("upcoming")
  getUpcoming(@CurrentRider() rider: AuthenticatedRider): Promise<BookingRide[]> {
    return this.rides.getUpcomingRides(rider.id);
  }

  @Get("history")
  getHistory(
    @CurrentRider() rider: AuthenticatedRider,
    @Query("cursor") cursor?: string,
    @Query("limit") rawLimit?: string,
  ): Promise<BookingRidePage> {
    const parsedLimit = Number.parseInt(rawLimit ?? "20", 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(50, Math.max(1, parsedLimit))
      : 20;
    return this.rides.getRideHistory(rider.id, {
      limit,
      ...(cursor == null ? {} : {cursor}),
    });
  }

  @Get(":rideId")
  async getRide(
    @CurrentRider() rider: AuthenticatedRider,
    @Param("rideId") rideId: string,
  ): Promise<BookingRide> {
    const ride = await this.rides.getRide(rideId, rider.id);
    if (ride == null) {
      throw new NotFoundException("Ride not found");
    }
    return ride;
  }
}
