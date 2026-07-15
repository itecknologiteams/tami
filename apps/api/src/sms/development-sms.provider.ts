import { Injectable, Logger } from "@nestjs/common";
import { SmsProvider } from "./sms.provider";

@Injectable()
export class DevelopmentSmsProvider extends SmsProvider {
  readonly logger = new Logger(DevelopmentSmsProvider.name);

  async send(phone: string, body: string): Promise<void> {
    this.logger.log(`[dev sms] -> ${phone}: ${body}`);
  }
}
