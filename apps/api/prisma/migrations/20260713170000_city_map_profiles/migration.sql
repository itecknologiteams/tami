ALTER TABLE "City"
  ADD COLUMN "centerLatitude" DECIMAL(9, 6),
  ADD COLUMN "centerLongitude" DECIMAL(9, 6),
  ADD COLUMN "searchWest" DECIMAL(9, 6),
  ADD COLUMN "searchSouth" DECIMAL(9, 6),
  ADD COLUMN "searchEast" DECIMAL(9, 6),
  ADD COLUMN "searchNorth" DECIMAL(9, 6);

ALTER TABLE "City"
  ADD CONSTRAINT "City_map_profile_complete" CHECK (
    (
      "centerLatitude" IS NULL AND
      "centerLongitude" IS NULL AND
      "searchWest" IS NULL AND
      "searchSouth" IS NULL AND
      "searchEast" IS NULL AND
      "searchNorth" IS NULL
    ) OR (
      "centerLatitude" IS NOT NULL AND
      "centerLongitude" IS NOT NULL AND
      "searchWest" IS NOT NULL AND
      "searchSouth" IS NOT NULL AND
      "searchEast" IS NOT NULL AND
      "searchNorth" IS NOT NULL AND
      "searchWest" < "searchEast" AND
      "searchSouth" < "searchNorth" AND
      "centerLongitude" BETWEEN "searchWest" AND "searchEast" AND
      "centerLatitude" BETWEEN "searchSouth" AND "searchNorth"
    )
  );
