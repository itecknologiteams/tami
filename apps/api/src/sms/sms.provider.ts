export abstract class SmsProvider {
  abstract send(phone: string, body: string): Promise<void>;
}
