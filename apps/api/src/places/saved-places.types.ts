export type SavedPlaceDesignation = "home" | "work";

export type SavedPlace = {
  id: string;
  riderId: string;
  cityId: string;
  designation: SavedPlaceDesignation | null;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
};

export type SavedPlacePayload = {
  designation?: SavedPlaceDesignation | null;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
};

export type SaveSavedPlaceForRider = {
  placeId?: string;
  riderId: string;
  cityId: string;
  designation: SavedPlaceDesignation | null;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  timestamp: string;
};
