-- Before/after pairing: each photo can optionally point at a "before"
-- counterpart. A photo with before_photo_id set is the "after" half.
-- Each photo participates in at most one pair (uniqueness enforced).

ALTER TABLE photos
  ADD COLUMN before_photo_id uuid REFERENCES photos(id) ON DELETE SET NULL;

-- Can't pair a photo with itself.
ALTER TABLE photos
  ADD CONSTRAINT photos_before_not_self
  CHECK (before_photo_id IS NULL OR before_photo_id != id);

-- A given "before" photo may only be paired to one "after" photo.
CREATE UNIQUE INDEX photos_before_photo_id_unique
  ON photos(before_photo_id)
  WHERE before_photo_id IS NOT NULL;
