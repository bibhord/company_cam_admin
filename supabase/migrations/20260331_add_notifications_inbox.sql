-- Add report_nudge to the notification_event enum
ALTER TYPE notification_event ADD VALUE IF NOT EXISTS 'report_nudge';

-- Notification inbox (stores nudges + future in-app notifications)
CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event       notification_event NOT NULL,
  title       text NOT NULL,
  body        text,
  action_url  text,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_unread_idx ON notifications(user_id, read) WHERE read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user read own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user update own"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
