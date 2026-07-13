import {
  Body,
  Controller,
  Headers,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
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
    @Headers("idempotency-key") idempotencyKey?: string,
  ): Promise<BookingRide> {
    return this.bookingService.createRide({
      ...request,
      cityId: rider.cityId,
      riderId: rider.id,
      idempotencyKey: idempotencyKey ?? "",
    });
  }

  @Post("rides/:rideId/cancel")
  @UseGuards(RiderAuthGuard)
  async cancelRide(
    @CurrentRider() rider: AuthenticatedRider,
    @Param("rideId") rideId: string,
  ): Promise<BookingRide> {
    const ride = await this.bookingService.cancelRide({
      rideId,
      riderId: rider.id,
    });
    if (ride == null) {
      throw new NotFoundException("Ride not found or cannot be cancelled");
    }
    return ride;
  }
}
