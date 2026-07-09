import { describe, expect, it } from "vitest";
import { defaultSindhMapStyle } from "./maps";

describe("map provider config", () => {
  it("uses the approved MapLibre public provider", () => {
    expect(defaultSindhMapStyle.provider).toBe("maplibre_public");
  });

  it("uses the requested streets v2 style family", () => {
    expect(defaultSindhMapStyle.styleId).toBe("streets-v2");
  });

  it("does not use maplibre-gl-js as the default web package decision", () => {
    expect(defaultSindhMapStyle.webPackage).not.toBe("maplibre-gl-js");
  });

  it("uses Flutter as the mobile runtime direction", () => {
    expect(defaultSindhMapStyle.mobileRuntime).toBe("flutter");
    expect(defaultSindhMapStyle.mobilePackage).not.toBe("@maplibre/maplibre-react-native");
  });
});
