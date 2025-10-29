export interface PhotoRecord {
  id: string;
  name: string | null;
  url: string | null;
  created_at: string;
  project_id: string | null;
  object_key: string | null;
  notes: string | null;
  tags: string[] | null;
  upload_status: string | null;
  status: string | null;
  created_by: string | null;
  signedUrl?: string | null;
  projects?:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
}

export interface ProjectRecord {
  id: string;
  name: string | null;
  created_by: string | null;
  org_id: string | null;
  created_at: string | null;
}

export interface ProfileRow {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  is_active: boolean;
  org_id: string | null;
  created_at: string | null;
}
