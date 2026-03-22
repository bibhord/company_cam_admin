-- Add specialty and language columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;
