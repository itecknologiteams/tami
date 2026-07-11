export type RideChatMessage = {
  id: string;
  rideId: string;
  senderType: "rider" | "driver" | "admin" | "system";
  senderId: string;
  body: string;
  sentAt: string;
};
