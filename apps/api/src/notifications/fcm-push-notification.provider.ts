import { Injectable, Logger } from "@nestjs/common";
import {
  PushNotification,
  PushNotificationProvider,
} from "./push-notification.provider";

export class PushNotificationProviderException extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PushNotificationProviderException";
  }
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

type FcmPushNotificationProviderOptions = {
  serverKey: string;
  fetcher?: Fetcher;
  baseUrl?: string;
  timeoutMilliseconds?: number;
};

/**
 * Sends pushes through the legacy FCM HTTP API using a server key. Failures
 * are logged and swallowed — a push failure must never fail the underlying
 * ride/chat action that triggered it.
 */
@Injectable()
export class FcmPushNotificationProvider extends PushNotificationProvider {
  private readonly logger = new Logger(FcmPushNotificationProvider.name);
  private readonly serverKey: string;
  private readonly fetcher: Fetcher;
  private readonly baseUrl: string;
  private readonly timeoutMilliseconds: number;

  constructor(options: FcmPushNotificationProviderOptions) {
    super();
    this.serverKey = options.serverKey.trim();
    if (this.serverKey.length === 0) {
      throw new Error("TAMI_FCM_SERVER_KEY is required");
    }
    this.fetcher = options.fetcher ?? globalThis.fetch;
    this.baseUrl = options.baseUrl ?? "https://fcm.googleapis.com/fcm/send";
    this.timeoutMilliseconds = options.timeoutMilliseconds ?? 5000;
  }

  async send(deviceToken: string, notification: PushNotification): Promise<void> {
    try {
      const response = await this.fetcher(this.baseUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `key=${this.serverKey}`,
        },
        body: JSON.stringify({
          to: deviceToken,
          notification: {title: notification.title, body: notification.body},
          data: notification.data ?? {},
        }),
        signal: AbortSignal.timeout(this.timeoutMilliseconds),
      });
      if (!response.ok) {
        throw new PushNotificationProviderException(
          `FCM responded with status ${response.status}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Push notification delivery failed for ${deviceToken}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
