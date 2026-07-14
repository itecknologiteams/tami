import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { AuthService } from "../auth/auth.service";
import { DriverAuthService } from "../auth/driver-auth.service";
import { AuthRepository } from "../auth/auth.repository";
import { DriverAuthRepository } from "../auth/driver-auth.repository";
import {
  PushNotification,
  PushNotificationProvider,
} from "../notifications/push-notification.provider";
import { RealtimeEventBus } from "./realtime-event-bus";
import {
  ChatMessageEvent,
  NewRideOfferEvent,
  RideDriverLocationEvent,
  RideStateChangedEvent,
} from "./realtime-events.types";

/**
 * Reads the bearer token a client presents on connection. Clients are
 * expected to send it as `socket.handshake.auth.token`, e.g.:
 *   io("/rider", { auth: { token: riderAccessToken } })
 * A `?token=` query param is accepted as a fallback for clients that can't
 * set handshake auth (kept simple; not the primary path).
 */
export function extractHandshakeToken(socket: {
  handshake: {
    auth?: Record<string, unknown>;
    query?: Record<string, unknown>;
  };
}): string | null {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.length > 0) {
    return authToken;
  }
  const queryToken = socket.handshake.query?.token;
  if (typeof queryToken === "string" && queryToken.length > 0) {
    return queryToken;
  }
  if (Array.isArray(queryToken) && typeof queryToken[0] === "string") {
    return queryToken[0];
  }
  return null;
}

export function riderRoom(riderId: string): string {
  return `rider:${riderId}`;
}

export function driverRoom(driverId: string): string {
  return `driver:${driverId}`;
}

/**
 * Extracted, framework-light auth handshake logic so it can be unit tested
 * without standing up a real socket.io server. Given the raw handshake
 * object, authenticates against the appropriate service and returns the room
 * to join, or throws UnauthorizedException.
 */
@Injectable()
export class RealtimeAuthHandshake {
  constructor(
    private readonly authService: AuthService,
    private readonly driverAuthService: DriverAuthService,
  ) {}

  async authenticateRider(socket: {
    handshake: {
      auth?: Record<string, unknown>;
      query?: Record<string, unknown>;
    };
  }): Promise<{riderId: string; room: string}> {
    const token = extractHandshakeToken(socket);
    if (token == null) {
      throw new UnauthorizedException("Rider bearer token is required");
    }
    const rider = await this.authService.authenticate(token);
    return {riderId: rider.id, room: riderRoom(rider.id)};
  }

  async authenticateDriver(socket: {
    handshake: {
      auth?: Record<string, unknown>;
      query?: Record<string, unknown>;
    };
  }): Promise<{driverId: string; room: string}> {
    const token = extractHandshakeToken(socket);
    if (token == null) {
      throw new UnauthorizedException("Driver bearer token is required");
    }
    const driver = await this.driverAuthService.authenticate(token);
    return {driverId: driver.id, room: driverRoom(driver.id)};
  }
}

@Injectable()
@WebSocketGateway({namespace: "/rider", cors: {origin: true}})
export class RiderRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RiderRealtimeGateway.name);

  constructor(
    private readonly handshake: RealtimeAuthHandshake,
    private readonly realtimeEventBus: RealtimeEventBus,
    private readonly authRepository: AuthRepository,
    private readonly pushNotificationProvider: PushNotificationProvider,
  ) {
    this.realtimeEventBus.subscribe(
      "ride.state_changed",
      (event) => void this.onRideStateChanged(event),
    );
    this.realtimeEventBus.subscribe(
      "ride.driver_location",
      (event) => void this.onDriverLocation(event),
    );
    this.realtimeEventBus.subscribe(
      "chat.message",
      (event) => void this.onChatMessage(event),
    );
  }

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const {room} = await this.handshake.authenticateRider(socket);
      await socket.join(room);
    } catch (error) {
      this.logger.warn(
        `Rejecting rider socket connection: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      socket.disconnect(true);
    }
  }

  handleDisconnect(): void {
    // Rooms are cleaned up automatically by socket.io on disconnect.
  }

  @SubscribeMessage("ping")
  handlePing(): {pong: true} {
    return {pong: true};
  }

  private async onRideStateChanged(event: RideStateChangedEvent): Promise<void> {
    const room = riderRoom(event.riderId);
    await this.emitOrPush(room, "ride.state_changed", event, event.riderId, {
      title: "Ride update",
      body: `Your ride is now ${event.state.replaceAll("_", " ")}.`,
      data: {rideId: event.rideId, state: event.state},
    });
  }

  private async onDriverLocation(event: RideDriverLocationEvent): Promise<void> {
    const room = riderRoom(event.riderId);
    // Location pings are frequent and low value as a push notification; only
    // emit to a connected socket, skip the push fallback entirely.
    this.server.to(room).emit("ride.driver_location", event);
  }

  private async onChatMessage(event: ChatMessageEvent): Promise<void> {
    const room = riderRoom(event.riderId);
    await this.emitOrPush(room, "chat.message", event, event.riderId, {
      title: "New message",
      body: event.body,
      data: {rideId: event.rideId},
    });
  }

  private async emitOrPush(
    room: string,
    eventName: string,
    payload: unknown,
    riderId: string,
    notification: PushNotification,
  ): Promise<void> {
    this.server.to(room).emit(eventName, payload);
    try {
      const sockets = await this.server.in(room).fetchSockets();
      if (sockets.length > 0) {
        return;
      }
      const deviceToken = await this.authRepository.findDeviceToken(riderId);
      if (deviceToken != null) {
        await this.pushNotificationProvider.send(deviceToken, notification);
      }
    } catch (error) {
      this.logger.warn(
        `Push notification fallback failed for rider ${riderId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

@Injectable()
@WebSocketGateway({namespace: "/driver", cors: {origin: true}})
export class DriverRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DriverRealtimeGateway.name);

  constructor(
    private readonly handshake: RealtimeAuthHandshake,
    private readonly realtimeEventBus: RealtimeEventBus,
    private readonly driverAuthRepository: DriverAuthRepository,
    private readonly pushNotificationProvider: PushNotificationProvider,
  ) {
    this.realtimeEventBus.subscribe(
      "ride.state_changed",
      (event) => void this.onRideStateChanged(event),
    );
    this.realtimeEventBus.subscribe(
      "chat.message",
      (event) => void this.onChatMessage(event),
    );
    this.realtimeEventBus.subscribe(
      "ride.offer",
      (event) => void this.onRideOffer(event),
    );
  }

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const {room} = await this.handshake.authenticateDriver(socket);
      await socket.join(room);
    } catch (error) {
      this.logger.warn(
        `Rejecting driver socket connection: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      socket.disconnect(true);
    }
  }

  handleDisconnect(): void {
    // Rooms are cleaned up automatically by socket.io on disconnect.
  }

  @SubscribeMessage("ping")
  handlePing(): {pong: true} {
    return {pong: true};
  }

  private async onRideStateChanged(event: RideStateChangedEvent): Promise<void> {
    if (event.driverId == null) {
      return;
    }
    const room = driverRoom(event.driverId);
    await this.emitOrPush(room, "ride.state_changed", event, event.driverId, {
      title: "Ride update",
      body: `Ride is now ${event.state.replaceAll("_", " ")}.`,
      data: {rideId: event.rideId, state: event.state},
    });
  }

  private async onChatMessage(event: ChatMessageEvent): Promise<void> {
    if (event.driverId == null) {
      return;
    }
    const room = driverRoom(event.driverId);
    await this.emitOrPush(room, "chat.message", event, event.driverId, {
      title: "New message",
      body: event.body,
      data: {rideId: event.rideId},
    });
  }

  private async onRideOffer(event: NewRideOfferEvent): Promise<void> {
    const room = driverRoom(event.driverId);
    await this.emitOrPush(room, "ride.offer", event, event.driverId, {
      title: "New ride offer",
      body: "A new ride is available nearby.",
      data: {rideId: event.rideId},
    });
  }

  private async emitOrPush(
    room: string,
    eventName: string,
    payload: unknown,
    driverId: string,
    notification: PushNotification,
  ): Promise<void> {
    this.server.to(room).emit(eventName, payload);
    try {
      const sockets = await this.server.in(room).fetchSockets();
      if (sockets.length > 0) {
        return;
      }
      const deviceToken = await this.driverAuthRepository.findDeviceToken(
        driverId,
      );
      if (deviceToken != null) {
        await this.pushNotificationProvider.send(deviceToken, notification);
      }
    } catch (error) {
      this.logger.warn(
        `Push notification fallback failed for driver ${driverId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
