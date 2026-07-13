export type SindhCityMapProfile = {
  name: string;
  slug: string;
  centerLatitude: number;
  centerLongitude: number;
  searchWest: number;
  searchSouth: number;
  searchEast: number;
  searchNorth: number;
};

export const sindhCityMapProfiles: SindhCityMapProfile[] = [
  {
    name: "Karachi",
    slug: "karachi",
    centerLatitude: 24.8607,
    centerLongitude: 67.0011,
    searchWest: 66.6,
    searchSouth: 24.65,
    searchEast: 67.6,
    searchNorth: 25.45,
  },
  {
    name: "Hyderabad",
    slug: "hyderabad",
    centerLatitude: 25.396,
    centerLongitude: 68.3578,
    searchWest: 68.2,
    searchSouth: 25.25,
    searchEast: 68.6,
    searchNorth: 25.55,
  },
  {
    name: "Sukkur",
    slug: "sukkur",
    centerLatitude: 27.7244,
    centerLongitude: 68.8228,
    searchWest: 68.72,
    searchSouth: 27.55,
    searchEast: 69.02,
    searchNorth: 27.85,
  },
  {
    name: "Larkana",
    slug: "larkana",
    centerLatitude: 27.557,
    centerLongitude: 68.2028,
    searchWest: 68.1,
    searchSouth: 27.4,
    searchEast: 68.35,
    searchNorth: 27.7,
  },
  {
    name: "Mirpur Khas",
    slug: "mirpur-khas",
    centerLatitude: 25.5269,
    centerLongitude: 69.0111,
    searchWest: 69,
    searchSouth: 25.35,
    searchEast: 69.25,
    searchNorth: 25.65,
  },
];
