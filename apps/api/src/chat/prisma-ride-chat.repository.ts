import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RideChatRepository } from "./ride-chat.repository";
import type { RideChatMessage } from "./ride-chat.types";

function toRideChatMessage(message: {
  id: string;
  rideId: string;
  senderType: string;
  senderId: string;
  body: string;
  sentAt: Date;
}): RideChatMessage {
  return {
    id: message.id,
    rideId: message.rideId,
    senderType: message.senderType as RideChatMessage["senderType"],
    senderId: message.senderId,
    body: message.body,
    sentAt: message.sentAt.toISOString(),
  };
}

@Injectable()
export class PrismaRideChatRepository extends RideChatRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listForRide(rideId: string): Promise<RideChatMessage[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { rideId },
      orderBy: { sentAt: "asc" },
    });
    return messages.map(toRideChatMessage);
  }

  async createRiderMessage({
    rideId,
    riderId,
    body,
    sentAt,
  }: {
    rideId: string;
    riderId: string;
    body: string;
    sentAt: string;
  }): Promise<RideChatMessage> {
    const message = await this.prisma.chatMessage.create({
      data: {
        rideId,
        senderType: "rider",
        senderId: riderId,
        body,
        sentAt: new Date(sentAt),
      },
    });
    return toRideChatMessage(message);
  }
}
