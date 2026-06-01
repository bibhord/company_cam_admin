-- Per-project geocoded location so the mobile capture flow can auto-pick
-- the nearest project when the user takes a photo. NULL = no location set
-- (existing behavior — user picks manually).

ALTER TABLE projects
  ADD COLUMN lat double precision,
  ADD COLUMN lng double precision;

-- Range check: lat in [-90, 90], lng in [-180, 180]. Both NULL is fine.
ALTER TABLE projects
  ADD CONSTRAINT projects_lat_range CHECK (lat IS NULL OR (lat >= -90 AND lat <= 90)),
  ADD CONSTRAINT projects_lng_range CHECK (lng IS NULL OR (lng >= -180 AND lng <= 180));
