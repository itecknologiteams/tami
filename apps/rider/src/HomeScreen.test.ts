import { describe, expect, it } from "vitest";
import { riderHomeCopy } from "./HomeScreen.copy";

describe("HomeScreen", () => {
  it("exposes the booking title", () => {
    expect(riderHomeCopy.title).toBe("Book a Tami ride");
  });
});
