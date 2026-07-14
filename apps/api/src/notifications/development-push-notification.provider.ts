import { Injectable, Logger } from "@nestjs/common";
import {
  PushNotification,
  PushNotificationProvider,
} from "./push-notification.provider";

@Injectable()
export class DevelopmentPushNotificationProvider extends PushNotificationProvider {
  private readonly logger = new Logger(DevelopmentPushNotificationProvider.name);

  async send(deviceToken: string, notification: PushNotification): Promise<void> {
    this.logger.log(
      `[dev push] -> ${deviceToken}: ${notification.title} — ${notification.body}`,
    );
  }
}
