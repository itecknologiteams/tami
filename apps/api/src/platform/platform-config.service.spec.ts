import { describe, expect, it } from "vitest";
import { PlatformConfigService } from "./platform-config.service";

describe("PlatformConfigService", () => {
  it("returns Sindh launch cities and ride categories", () => {
    const service = new PlatformConfigService();
    const config = service.getConfig();

    expect(config.province).toBe("Sindh");
    expect(config.cities.map((city) => city.slug)).toEqual([
      "karachi",
      "hyderabad",
      "sukkur",
      "larkana",
      "mirpur-khas",
    ]);
    expect(config.rideCategories.map((category) => category.code)).toContain(
      "standard_taxi",
    );
    expect(config.rideCategories.map((category) => category.code)).toContain(
      "scheduled_ride",
    );
  });
});
