import { describe, expect, it, vi } from "vitest";
import { DevelopmentSmsProvider } from "./development-sms.provider";

describe("DevelopmentSmsProvider", () => {
  it("logs the phone and body instead of sending anything", async () => {
    const provider = new DevelopmentSmsProvider();
    const logSpy = vi.spyOn(provider.logger, "log").mockImplementation(() => undefined);

    await provider.send("+923001234567", "Your Tami code is 123456.");

    expect(logSpy).toHaveBeenCalledWith(
      "[dev sms] -> +923001234567: Your Tami code is 123456.",
    );
  });
});
