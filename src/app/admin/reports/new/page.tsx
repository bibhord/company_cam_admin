import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CreateReportForm } from './report-form';

interface ProfileRecord {
  org_id: string;
  role: 'admin' | 'manager' | 'standard' | 'restricted';
}

interface ProjectOption {
  id: string;
  name: string | null;
}

export default async function NewReportPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) {
    console.error('Error loading profile for new report:', profileError);
    return (
      <div className="p-8 text-red-500">
        Unable to load profile information. Please verify your Supabase policies and try again.
      </div>
    );
  }

  if (!(profile.role === 'admin' || profile.role === 'manager')) {
    return (
      <div className="p-8 text-red-500">
        You need administrative permissions to create reports.
      </div>
    );
  }

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('org_id', profile.org_id)
    .order('name', { ascending: true });

  if (projectsError) {
    console.error('Error loading projects for reports:', projectsError);
    return (
      <div className="p-8 text-red-500">
        Unable to load project list. Please confirm your row-level security policies.
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              <Link href="/admin/reports" className="text-indigo-600 hover:text-indigo-700">
                ← Back to reports
              </Link>
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Create Report</h1>
            <p className="mt-2 text-sm text-slate-600">
              Combine project photos into a polished PDF with notes and status updates.
            </p>
          </div>
        </header>

        <CreateReportForm projects={(projects ?? []) as ProjectOption[]} />
      </div>
    </div>
  );
}
