-- =====================================================================
-- Google Calendar busy-sync connections
-- =====================================================================
-- One row per org. When present, the public bookings slots endpoint
-- fetches free/busy from Google Calendar and removes any slot that
-- overlaps with the connected user's busy time.
-- =====================================================================

CREATE TABLE IF NOT EXISTS google_calendar_connections (
  org_id         uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  google_email   text NOT NULL,
  refresh_token  text NOT NULL,
  calendar_id    text NOT NULL DEFAULT 'primary',
  scope          text,
  connected_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at   timestamptz
);

ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='google_calendar_connections' AND policyname='gc_org_read') THEN
    CREATE POLICY gc_org_read ON google_calendar_connections FOR SELECT USING (
      org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='google_calendar_connections' AND policyname='gc_org_admins_write') THEN
    CREATE POLICY gc_org_admins_write ON google_calendar_connections FOR ALL USING (
      org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin','manager'))
    ) WITH CHECK (
      org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin','manager'))
    );
  END IF;
END $$;
