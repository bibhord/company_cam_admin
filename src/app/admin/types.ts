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
  projects?:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
}
