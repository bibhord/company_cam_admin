-- Organization approval status
ALTER TABLE organizations
  ADD COLUMN status text NOT NULL DEFAULT 'active'
    CONSTRAINT organizations_status_check CHECK (status IN ('pending', 'active', 'suspended'));

-- Super-admin flag (app-owner staff, transcends individual orgs)
ALTER TABLE profiles
  ADD COLUMN is_super_admin boolean NOT NULL DEFAULT false;

-- Index for pending approval queue
CREATE INDEX organizations_status_idx ON organizations(status) WHERE status = 'pending';
