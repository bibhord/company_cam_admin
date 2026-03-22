-- Add project_status enum and status column to projects table
CREATE TYPE project_status AS ENUM ('not_started', 'in_progress', 'blocked', 'completed');

ALTER TABLE projects
  ADD COLUMN status project_status NOT NULL DEFAULT 'not_started';
