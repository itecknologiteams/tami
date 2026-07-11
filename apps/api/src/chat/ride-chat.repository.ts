import type { RideChatMessage } from "./ride-chat.types";

export abstract class RideChatRepository {
  abstract listForRide(rideId: string): Promise<RideChatMessage[]>;

  abstract createRiderMessage(input: {
    rideId: string;
    riderId: string;
    body: string;
    sentAt: string;
  }): Promise<RideChatMessage>;
}
