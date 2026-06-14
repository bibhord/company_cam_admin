-- =====================================================================
-- Ensure-booking-schema: idempotent fix-up for missing tables/columns
-- =====================================================================
-- The original 20260604_add_bookings.sql migration had invalid syntax
-- (`create type if not exists` is not supported by Postgres), so the
-- booking + business_hours tables were never created. This script
-- creates them safely. Re-runs are no-ops.
--
-- Also ensures projects.featured exists, which some installations are
-- missing.
--
-- Run this in Supabase SQL editor BEFORE setup-realestate-demo.sql.
-- =====================================================================

-- 1. booking_status enum (handles "already exists" correctly)
DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'declined', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. business_hours
CREATE TABLE IF NOT EXISTS business_hours (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time   time NOT NULL DEFAULT '09:00',
  close_time  time NOT NULL DEFAULT '17:00',
  is_closed   boolean NOT NULL DEFAULT false,
  UNIQUE (org_id, day_of_week)
);

-- 3. bookings
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

-- 4. RLS
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings       ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_hours' AND policyname = 'org_members_read_bh') THEN
    CREATE POLICY org_members_read_bh ON business_hours FOR SELECT USING (
      org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_hours' AND policyname = 'public_read_bh') THEN
    CREATE POLICY public_read_bh ON business_hours FOR SELECT USING (
      org_id IN (SELECT id FROM organizations WHERE portfolio_published = true)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_hours' AND policyname = 'org_admins_write_bh') THEN
    CREATE POLICY org_admins_write_bh ON business_hours FOR ALL USING (
      org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin','manager'))
    ) WITH CHECK (
      org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin','manager'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'org_members_read_bookings') THEN
    CREATE POLICY org_members_read_bookings ON bookings FOR SELECT USING (
      org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'org_admins_update_bookings') THEN
    CREATE POLICY org_admins_update_bookings ON bookings FOR UPDATE USING (
      org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin','manager'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'public_insert_bookings') THEN
    CREATE POLICY public_insert_bookings ON bookings FOR INSERT WITH CHECK (
      org_id IN (SELECT id FROM organizations WHERE portfolio_published = true)
    );
  END IF;
END $$;

-- 5. projects.featured (some installations are missing this)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS projects_featured_idx ON projects(org_id, featured) WHERE featured = true;

-- 6. uuid-ossp for uuid_generate_v5 (used by the demo setup script)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Done.
