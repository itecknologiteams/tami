import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { SmsProvider } from "./sms.provider";

export class SmsDeliveryException extends HttpException {
  constructor(message: string, options?: ErrorOptions) {
    super(message, HttpStatus.BAD_GATEWAY, { cause: options?.cause });
    this.name = "SmsDeliveryException";
  }
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

type TwilioSmsProviderOptions = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  fetcher?: Fetcher;
  timeoutMilliseconds?: number;
};

/**
 * Placeholder SMS provider using Twilio's REST API directly. Production
 * Sindh deployment may swap this for a local aggregator by implementing
 * SmsProvider — no other file in the auth flow needs to change.
 */
@Injectable()
export class TwilioSmsProvider extends SmsProvider {
  private readonly logger = new Logger(TwilioSmsProvider.name);
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;
  private readonly fetcher: Fetcher;
  private readonly timeoutMilliseconds: number;

  constructor(options: TwilioSmsProviderOptions) {
    super();
    this.accountSid = options.accountSid.trim();
    if (this.accountSid.length === 0) {
      throw new Error("TAMI_TWILIO_ACCOUNT_SID is required");
    }
    this.authToken = options.authToken.trim();
    if (this.authToken.length === 0) {
      throw new Error("TAMI_TWILIO_AUTH_TOKEN is required");
    }
    this.fromNumber = options.fromNumber.trim();
    if (this.fromNumber.length === 0) {
      throw new Error("TAMI_TWILIO_FROM_NUMBER is required");
    }
    this.fetcher = options.fetcher ?? globalThis.fetch;
    this.timeoutMilliseconds = options.timeoutMilliseconds ?? 5000;
  }

  async send(phone: string, body: string): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const credentials = Buffer.from(
      `${this.accountSid}:${this.authToken}`,
    ).toString("base64");

    let response: Response;
    try {
      response = await this.fetcher(url, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          To: phone,
          From: this.fromNumber,
          Body: body,
        }).toString(),
        signal: AbortSignal.timeout(this.timeoutMilliseconds),
      });
    } catch (error) {
      this.logger.error(
        `SMS delivery failed for ${phone}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new SmsDeliveryException("SMS delivery is unavailable", {
        cause: error,
      });
    }

    if (!response.ok) {
      this.logger.error(
        `SMS delivery failed for ${phone} with status ${response.status}`,
      );
      throw new SmsDeliveryException("SMS delivery is unavailable");
    }
  }
}
