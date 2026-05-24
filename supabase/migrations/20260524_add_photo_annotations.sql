-- Photo annotations (shapes overlaid on photos)
-- Non-destructive: stored as JSONB, never burned into the original image.
CREATE TABLE photo_annotations (
  photo_id   uuid PRIMARY KEY REFERENCES photos(id) ON DELETE CASCADE,
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  data       jsonb NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX photo_annotations_org_id_idx ON photo_annotations(org_id);

ALTER TABLE photo_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY photo_annotations_select ON photo_annotations
  FOR SELECT USING (org_id = (SELECT org_id FROM _v_me));

CREATE POLICY photo_annotations_upsert ON photo_annotations
  FOR ALL USING (org_id = (SELECT org_id FROM _v_me))
  WITH CHECK (org_id = (SELECT org_id FROM _v_me));
