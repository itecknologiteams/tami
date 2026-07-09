import type { Coordinates } from "./geo";

export type MapProviderName = "maplibre_public";

export type MapStyleId = "streets-v2";

export type MapStyleConfig = {
  provider: MapProviderName;
  styleId: MapStyleId;
  mobileRuntime: "flutter";
  mobilePackage: "flutter_maplibre_pending";
  webPackage: "non_gl_admin_map_pending";
  styleUrlTemplate: string;
  defaultCenter: Coordinates;
  defaultZoom: number;
};

export const defaultSindhMapStyle: MapStyleConfig = {
  provider: "maplibre_public",
  styleId: "streets-v2",
  mobileRuntime: "flutter",
  mobilePackage: "flutter_maplibre_pending",
  webPackage: "non_gl_admin_map_pending",
  styleUrlTemplate: "maplibre-public://styles/streets-v2",
  defaultCenter: {
    latitude: 24.8607,
    longitude: 67.0011,
  },
  defaultZoom: 11,
};
