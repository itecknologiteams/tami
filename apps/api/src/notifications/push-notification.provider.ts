export type PushNotification = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export abstract class PushNotificationProvider {
  abstract send(deviceToken: string, notification: PushNotification): Promise<void>;
}
