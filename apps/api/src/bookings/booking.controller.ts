import { Body, Controller, Post } from "@nestjs/common";
import { BookingService } from "./booking.service";
import { BookingRide, CreateRideRequest } from "./booking.types";

@Controller("bookings")
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post("rides")
  createRide(@Body() request: CreateRideRequest): Promise<BookingRide> {
    return this.bookingService.createRide(request);
  }
}
