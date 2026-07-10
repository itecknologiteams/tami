import { Injectable, NotFoundException } from "@nestjs/common";
import { AuthRepository } from "../auth/auth.repository";
import { RiderProfile } from "../auth/auth.types";

export type UpdateRiderProfileRequest = {
  cityId: string;
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
};

@Injectable()
export class RiderProfileService {
  constructor(private readonly repository: AuthRepository) {}

  async getProfile(riderId: string): Promise<RiderProfile> {
    const rider = await this.repository.findRiderById(riderId);
    if (!rider) {
      throw new NotFoundException("Rider profile does not exist");
    }

    return rider;
  }

  async updateProfile(
    riderId: string,
    request: UpdateRiderProfileRequest,
  ): Promise<RiderProfile> {
    const cityIsActive = await this.repository.isCityActive(request.cityId);
    if (!cityIsActive) {
      throw new NotFoundException("City is unavailable for rider profile");
    }

    const rider = await this.getProfile(riderId);
    return this.repository.updateRiderProfile(riderId, {
      cityId: request.cityId,
      name: request.name ?? rider.name,
      email: request.email ?? rider.email,
      imageUrl: request.imageUrl ?? rider.imageUrl,
    });
  }
}
