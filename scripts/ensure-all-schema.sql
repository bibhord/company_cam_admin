-- =====================================================================
-- ensure-all-schema.sql — comprehensive idempotent fix-up
-- =====================================================================
-- Several historical migrations had bugs or were never applied to
-- production. This script ensures every table/column the app actually
-- queries is present. Safe to re-run.
-- =====================================================================

-- 1. Extensions ---------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Booking system -----------------------------------------------------
DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'declined', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS business_hours (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time   time NOT NULL DEFAULT '09:00',
  close_time  time NOT NULL DEFAULT '17:00',
  is_closed   boolean NOT NULL DEFAULT false,
  UNIQUE (org_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS bookings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id     uuid REFERENCES services(id) ON DELETE SET NULL,
  service_name   text NOT NULL,
  duration_min   integer NOT NULL DEFAULT 60,
  customer_name  text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  notes          text,
  booking_date   date NOT NULL,
  booking_time   time NOT NULL,
  status         booking_status NOT NULL DEFAULT 'pending',
  admin_notes    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings       ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='business_hours' AND policyname='org_members_read_bh') THEN
    CREATE POLICY org_members_read_bh ON business_hours FOR SELECT USING (
      org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='business_hours' AND policyname='public_read_bh') THEN
    CREATE POLICY public_read_bh ON business_hours FOR SELECT USING (
      org_id IN (SELECT id FROM organizations WHERE portfolio_published = true)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='business_hours' AND policyname='org_admins_write_bh') THEN
    CREATE POLICY org_admins_write_bh ON business_hours FOR ALL USING (
      org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin','manager'))
    ) WITH CHECK (
      org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin','manager'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings' AND policyname='org_members_read_bookings') THEN
    CREATE POLICY org_members_read_bookings ON bookings FOR SELECT USING (
      org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings' AND policyname='org_admins_update_bookings') THEN
    CREATE POLICY org_admins_update_bookings ON bookings FOR UPDATE USING (
      org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin','manager'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings' AND policyname='public_insert_bookings') THEN
    CREATE POLICY public_insert_bookings ON bookings FOR INSERT WITH CHECK (
      org_id IN (SELECT id FROM organizations WHERE portfolio_published = true)
    );
  END IF;
END $$;

-- 3. Projects ----------------------------------------------------------
ALTER TABLE projects ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS projects_featured_idx ON projects(org_id, featured) WHERE featured = true;

-- 4. Photos ------------------------------------------------------------
-- bucket column for Before/After categorization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='photos' AND column_name='bucket') THEN
    ALTER TABLE photos ADD COLUMN bucket text CHECK (bucket IN ('before','after'));
  END IF;
END $$;

-- 5. Photo annotations -------------------------------------------------
CREATE TABLE IF NOT EXISTS photo_annotations (
  photo_id   uuid PRIMARY KEY REFERENCES photos(id) ON DELETE CASCADE,
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  data       jsonb NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photo_annotations_org_id_idx ON photo_annotations(org_id);
ALTER TABLE photo_annotations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='photo_annotations' AND policyname='photo_annotations_select') THEN
    CREATE POLICY photo_annotations_select ON photo_annotations FOR SELECT
      USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='photo_annotations' AND policyname='photo_annotations_upsert') THEN
    CREATE POLICY photo_annotations_upsert ON photo_annotations FOR ALL
      USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()))
      WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));
  END IF;
END $$;
