import { describe, expect, it, vi } from "vitest";
import { SmsDeliveryException, TwilioSmsProvider } from "./twilio-sms.provider";

describe("TwilioSmsProvider", () => {
  it("posts the message to the Twilio messages endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", {status: 201}));
    const provider = new TwilioSmsProvider({
      accountSid: "AC_test",
      authToken: "secret",
      fromNumber: "+15005550006",
      fetcher,
    });

    await provider.send("+923001234567", "Your Tami code is 123456.");

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe(
      "https://api.twilio.com/2010-04-01/Accounts/AC_test/Messages.json",
    );
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe(
      `Basic ${Buffer.from("AC_test:secret").toString("base64")}`,
    );
    const body = new URLSearchParams(init.body as string);
    expect(body.get("To")).toBe("+923001234567");
    expect(body.get("From")).toBe("+15005550006");
    expect(body.get("Body")).toBe("Your Tami code is 123456.");
  });

  it("throws SmsDeliveryException when Twilio is unreachable", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));
    const provider = new TwilioSmsProvider({
      accountSid: "AC_test",
      authToken: "secret",
      fromNumber: "+15005550006",
      fetcher,
    });

    await expect(
      provider.send("+923001234567", "code"),
    ).rejects.toThrow(SmsDeliveryException);
  });

  it("throws SmsDeliveryException on a non-success response without leaking the upstream status", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("Bad Request", {status: 400}));
    const provider = new TwilioSmsProvider({
      accountSid: "AC_test",
      authToken: "secret",
      fromNumber: "+15005550006",
      fetcher,
    });

    await expect(
      provider.send("+923001234567", "code"),
    ).rejects.toThrow("SMS delivery is unavailable");
  });

  it("maps SmsDeliveryException to a 502 Bad Gateway HTTP status", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("Bad Request", {status: 400}));
    const provider = new TwilioSmsProvider({
      accountSid: "AC_test",
      authToken: "secret",
      fromNumber: "+15005550006",
      fetcher,
    });

    expect.assertions(2);
    try {
      await provider.send("+923001234567", "code");
    } catch (error) {
      expect(error).toBeInstanceOf(SmsDeliveryException);
      expect((error as SmsDeliveryException).getStatus()).toBe(502);
    }
  });

  it("rejects blank credentials", () => {
    expect(
      () =>
        new TwilioSmsProvider({
          accountSid: "   ",
          authToken: "secret",
          fromNumber: "+15005550006",
        }),
    ).toThrow("TAMI_TWILIO_ACCOUNT_SID is required");
  });
});
