import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { ChecklistsClient } from './checklists-client';

interface ProfileRecord {
  org_id: string;
  role: 'admin' | 'manager' | 'standard' | 'restricted';
}

interface ChecklistRow {
  id: string;
  name: string;
  project_id: string;
  created_at: string;
  created_by: string;
  projects?: Array<{
    name: string | null;
  }> | null;
  checklist_items?: Array<{
    state: 'todo' | 'doing' | 'done' | 'n/a';
  }> | null;
}

export default async function ChecklistsPage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not found for checklists page');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) {
    console.error('Error loading profile for checklists:', profileError);
    return (
      <div className="p-10">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-red-600">Unable to load profile</h1>
          <p className="mt-2 text-sm text-slate-600">Verify Supabase policies and try again.</p>
        </div>
      </div>
    );
  }

  const { data: checklists, error: checklistError } = await supabase
    .from('checklists')
    .select('id, name, project_id, created_at, created_by, projects ( name ), checklist_items ( state )')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  if (checklistError) {
    console.error('Error loading checklists:', checklistError);
    return (
      <div className="p-10">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-red-600">Unable to load checklists</h1>
          <p className="mt-2 text-sm text-slate-600">{checklistError.message}</p>
        </div>
      </div>
    );
  }

  const rows = (checklists ?? []) as ChecklistRow[];
  const normalized = rows.map((row) => {
    const items = row.checklist_items ?? [];
    const total = items.length;
    const done = items.filter((item) => item.state === 'done' || item.state === 'n/a').length;
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);
    const isFinished = total > 0 && done === total;
    return {
      id: row.id,
      name: row.name,
      projectName: row.projects?.[0]?.name ?? 'Untitled Project',
      createdAt: row.created_at,
      createdBy: row.created_by,
      progress,
      totalItems: total,
      doneItems: done,
      isFinished,
    };
  });

  return <ChecklistsClient checklists={normalized} />;
}
