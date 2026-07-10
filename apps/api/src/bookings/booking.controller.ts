import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  CurrentRider,
  RiderAuthGuard,
} from "../auth/rider-auth.guard";
import { AuthenticatedRider } from "../auth/auth.types";
import { BookingService } from "./booking.service";
import { BookingRide, CreateRideRequest } from "./booking.types";

@Controller("bookings")
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post("rides")
  @UseGuards(RiderAuthGuard)
  createRide(
    @CurrentRider() rider: AuthenticatedRider,
    @Body() request: CreateRideRequest,
  ): Promise<BookingRide> {
    return this.bookingService.createRide({
      ...request,
      cityId: rider.cityId,
      riderId: rider.id,
    });
  }
}
