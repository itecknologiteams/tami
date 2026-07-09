import { describe, expect, it } from "vitest";
import { driverHomeCopy } from "./DriverHomeScreen.copy";

describe("DriverHomeScreen", () => {
  it("exposes the driver title", () => {
    expect(driverHomeCopy.title).toBe("Tami Driver");
  });
});
