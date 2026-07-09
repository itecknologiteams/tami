import { Injectable } from "@nestjs/common";

export type PlatformCity = {
  name: string;
  slug: string;
};

export type PlatformRideCategory = {
  code:
    | "standard_taxi"
    | "women_family_preferred"
    | "airport"
    | "accessible_special_assistance"
    | "government_staff_movement"
    | "scheduled_ride";
  name: string;
};

export type PlatformConfig = {
  province: "Sindh";
  cities: PlatformCity[];
  rideCategories: PlatformRideCategory[];
};

@Injectable()
export class PlatformConfigService {
  getConfig(): PlatformConfig {
    return {
      province: "Sindh",
      cities: [
        { name: "Karachi", slug: "karachi" },
        { name: "Hyderabad", slug: "hyderabad" },
        { name: "Sukkur", slug: "sukkur" },
        { name: "Larkana", slug: "larkana" },
        { name: "Mirpur Khas", slug: "mirpur-khas" },
      ],
      rideCategories: [
        { code: "standard_taxi", name: "Standard Taxi" },
        { code: "women_family_preferred", name: "Women/Family Preferred" },
        { code: "airport", name: "Airport" },
        {
          code: "accessible_special_assistance",
          name: "Accessible / Special Assistance",
        },
        {
          code: "government_staff_movement",
          name: "Government / Staff Movement",
        },
        { code: "scheduled_ride", name: "Scheduled Ride" },
      ],
    };
  }
}
