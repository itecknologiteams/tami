import { Injectable } from "@nestjs/common";
import { EventEmitter } from "node:events";
import type { RealtimeEventMap, RealtimeEventName } from "./realtime-events.types";

/**
 * Decouples ride/chat/driver services from the Socket.IO gateway: services
 * publish domain events here, the gateway is the only subscriber that knows
 * how to turn them into socket emissions or push notifications.
 */
@Injectable()
export class RealtimeEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  publish<Name extends RealtimeEventName>(
    name: Name,
    payload: RealtimeEventMap[Name],
  ): void {
    this.emitter.emit(name, payload);
  }

  subscribe<Name extends RealtimeEventName>(
    name: Name,
    handler: (payload: RealtimeEventMap[Name]) => void,
  ): void {
    this.emitter.on(name, handler);
  }
}
