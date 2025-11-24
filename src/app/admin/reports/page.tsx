import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';

interface ProfileRecord {
  org_id: string;
  role: 'admin' | 'manager' | 'standard' | 'restricted';
}

interface ReportRow {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  project_id: string;
  created_at: string;
  published_at: string | null;
  projects?: {
    name: string | null;
  } | null;
}

const statusBadge = (status: ReportRow['status']) => {
  switch (status) {
    case 'published':
      return 'bg-emerald-100 text-emerald-700';
    case 'archived':
      return 'bg-slate-100 text-slate-600';
    case 'draft':
    default:
      return 'bg-amber-100 text-amber-700';
  }
};

export default async function ReportsPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not found for reports page');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) {
    console.error('Error loading profile for reports:', profileError);
    return (
      <div className="p-10">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-red-600">Unable to load profile</h1>
          <p className="mt-2 text-sm text-slate-600">Verify Supabase policies and try again.</p>
        </div>
      </div>
    );
  }

  const { data: reports, error: reportsError } = await supabase
    .from('reports')
    .select('id, title, status, project_id, created_at, published_at, projects ( name )')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  if (reportsError) {
    console.error('Error loading reports:', reportsError);
    return (
      <div className="p-10">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-red-600">Unable to load reports</h1>
          <p className="mt-2 text-sm text-slate-600">{reportsError.message}</p>
        </div>
      </div>
    );
  }

  const reportRows = (reports ?? []) as ReportRow[];

  return (
    <div className="px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">
            Generate polished PDFs that compile project photos, notes, and annotations for clients or insurers.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/reports/new"
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <span className="text-lg">+</span>
            Create Report
          </Link>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Watch Tutorial
          </button>
        </div>
      </div>

      {reportRows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-indigo-200 bg-white px-12 py-16 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Professional Photo Reports in Seconds.</h2>
          <p className="mt-3 text-sm text-slate-600">
            Share a PDF of photos with insurance agencies and clients. Select project photos, add notes, and publish.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/admin/reports/new"
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <span className="text-lg">+</span>
              Create Report
            </Link>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Watch Tutorial
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {reportRows.map((report) => (
            <div key={report.id} className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{report.title}</h2>
                  <p className="text-xs text-slate-500">
                    {report.projects?.name ?? 'Unassigned Project'} • Created{' '}
                    {new Date(report.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadge(report.status)}`}>
                  {report.status}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                {report.published_at
                  ? `Published on ${new Date(report.published_at).toLocaleDateString()}`
                  : 'Draft in progress'}
              </p>
              <div className="mt-6 flex gap-3">
                <Link
                  href={`/admin/reports/${report.id}`}
                  className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  View report
                </Link>
                <Link
                  href={`/admin/reports/${report.id}/edit`}
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
