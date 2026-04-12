-- Shareable read-only project links
CREATE TABLE project_shares (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token       uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  expires_at  timestamptz,        -- NULL = never expires
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Public read by token (no auth required)
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read by token"
  ON project_shares FOR SELECT
  USING (true);

CREATE POLICY "owner insert"
  ON project_shares FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "owner delete"
  ON project_shares FOR DELETE
  USING (auth.uid() = created_by);
