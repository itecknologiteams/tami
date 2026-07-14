import type { RideState } from "@tami/shared";

export type RideStateChangedEvent = {
  rideId: string;
  riderId: string;
  driverId: string | null;
  state: RideState;
  occurredAt: string;
};

export type RideDriverLocationEvent = {
  rideId: string;
  riderId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  occurredAt: string;
};

export type ChatMessageEvent = {
  rideId: string;
  riderId: string;
  driverId: string | null;
  senderType: "rider" | "driver" | "admin" | "system";
  senderId: string;
  body: string;
  sentAt: string;
};

export type NewRideOfferEvent = {
  rideId: string;
  driverId: string;
};

export type RealtimeEventMap = {
  "ride.state_changed": RideStateChangedEvent;
  "ride.driver_location": RideDriverLocationEvent;
  "chat.message": ChatMessageEvent;
  "ride.offer": NewRideOfferEvent;
};

export type RealtimeEventName = keyof RealtimeEventMap;
