import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

interface ProjectRow {
  id: string;
  name: string;
  status: string | null;
  org_id: string;
  created_at: string;
  org_name: string;
  org_is_demo: boolean;
  photo_count: number;
}

export default async function SuperadminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; page?: string; org?: string }>;
}) {
  const { demo, page, org } = await searchParams;
  const includeDemo = demo === 'show';
  const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: orgs } = await svc
    .from('organizations')
    .select('id, name, is_demo');

  const orgMap: Record<string, { name: string; is_demo: boolean }> = {};
  for (const o of orgs ?? []) orgMap[o.id] = { name: o.name, is_demo: o.is_demo };

  const visibleOrgIds = (orgs ?? [])
    .filter((o) => includeDemo || !o.is_demo)
    .filter((o) => !org || o.id === org)
    .map((o) => o.id);

  const filterOrgName = org ? orgMap[org]?.name : null;

  const { data: projects, count } = await svc
    .from('projects')
    .select('id, name, status, org_id, created_at', { count: 'exact' })
    .in('org_id', visibleOrgIds.length > 0 ? visibleOrgIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: photoCounts } = projectIds.length
    ? await svc.from('photos').select('project_id').in('project_id', projectIds)
    : { data: [] as { project_id: string }[] };

  const photoMap: Record<string, number> = {};
  for (const p of photoCounts ?? []) {
    if (p.project_id) photoMap[p.project_id] = (photoMap[p.project_id] ?? 0) + 1;
  }

  const rows: ProjectRow[] = (projects ?? []).map((p) => ({
    ...p,
    org_name: orgMap[p.org_id]?.name ?? 'Unknown',
    org_is_demo: orgMap[p.org_id]?.is_demo ?? false,
    photo_count: photoMap[p.id] ?? 0,
  }));

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            {filterOrgName ? `Projects · ${filterOrgName}` : 'All Projects'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{count ?? 0} total · page {pageNum} of {totalPages}</p>
          {filterOrgName && (
            <Link href="/superadmin/projects" className="mt-1 inline-block text-xs text-amber-500 hover:text-amber-400">
              ← Clear filter
            </Link>
          )}
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
          <Tab href="/superadmin/projects" label="Real orgs" active={!includeDemo} />
          <Tab href="/superadmin/projects?demo=show" label="Include demo" active={includeDemo} />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3">Project</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Photos</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-800/50">
                <td className="px-5 py-3 font-medium text-slate-100">{r.name}</td>
                <td className="px-4 py-3">
                  <Link href={`/superadmin/orgs/${r.org_id}`} className="text-slate-400 hover:text-amber-400">
                    {r.org_name}
                  </Link>
                  {r.org_is_demo && (
                    <span className="ml-2 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-xs text-violet-400">demo</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-400">{r.photo_count}</td>
                <td className="px-4 py-3 text-slate-400">{r.status ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">
                  No projects found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {pageNum > 1 && (
            <Link
              href={`/superadmin/projects?${new URLSearchParams({ ...(includeDemo && { demo: 'show' }), page: String(pageNum - 1) })}`}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              ← Previous
            </Link>
          )}
          <span className="text-xs text-slate-500">Page {pageNum} of {totalPages}</span>
          {pageNum < totalPages && (
            <Link
              href={`/superadmin/projects?${new URLSearchParams({ ...(includeDemo && { demo: 'show' }), page: String(pageNum + 1) })}`}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
        active ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
    </Link>
  );
}
