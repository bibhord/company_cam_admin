import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface OrgRow {
  id: string;
  name: string;
  status: string;
  plan: string;
  trial_ends_at: string;
  created_at: string;
  is_demo: boolean;
  user_count: number;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400',
  active: 'bg-emerald-500/20 text-emerald-400',
  suspended: 'bg-red-500/20 text-red-400',
};

const PLAN_STYLES: Record<string, string> = {
  trial: 'bg-blue-500/20 text-blue-400',
  basic: 'bg-slate-600/40 text-slate-300',
  pro: 'bg-indigo-500/20 text-indigo-400',
};

export default async function OrgsPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; status?: string; plan?: string; recent?: string }>;
}) {
  const { demo, status, plan, recent } = await searchParams;
  const showDemo = demo === 'show' || demo === 'only';
  const demoOnly = demo === 'only';
  const recentOnly = recent === '1';
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: orgs } = await svc
    .from('organizations')
    .select('id, name, status, plan, trial_ends_at, created_at, is_demo')
    .order('created_at', { ascending: false });

  const { data: profileCounts } = await svc
    .from('profiles')
    .select('org_id');

  const countMap: Record<string, number> = {};
  for (const p of profileCounts ?? []) {
    countMap[p.org_id] = (countMap[p.org_id] ?? 0) + 1;
  }

  const allRows: OrgRow[] = (orgs ?? []).map((o) => ({
    ...o,
    user_count: countMap[o.id] ?? 0,
  }));

  let rows = demoOnly
    ? allRows.filter((o) => o.is_demo)
    : showDemo
      ? allRows
      : allRows.filter((o) => !o.is_demo);

  if (status) rows = rows.filter((o) => o.status === status);
  if (plan) rows = rows.filter((o) => o.plan === plan);
  if (recentOnly) rows = rows.filter((o) => o.created_at > sevenDaysAgo);

  const demoCount = allRows.filter((o) => o.is_demo).length;

  const pending = rows.filter((o) => o.status === 'pending');
  const rest = rows.filter((o) => o.status !== 'pending');

  const sections = [
    ...(pending.length > 0 ? [{ label: `Pending Approval (${pending.length})`, orgs: pending }] : []),
    { label: demoOnly ? 'Demo Organizations' : 'All Organizations', orgs: rest },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Organizations</h1>
          <p className="mt-1 text-sm text-slate-500">{rows.length} shown · {allRows.length} total · {demoCount} demo</p>
        </div>

        <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
          <FilterTab href="/superadmin/orgs" label="Real" active={!showDemo} />
          <FilterTab href="/superadmin/orgs?demo=show" label="All" active={showDemo && !demoOnly} />
          <FilterTab href="/superadmin/orgs?demo=only" label="Demo" active={demoOnly} />
        </div>
      </div>

      {sections.map((section) => (
        <div key={section.label} className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {section.label}
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Organization</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Users</th>
                  <th className="px-4 py-3">Signed Up</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {section.orgs.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-medium text-slate-100">
                      {org.name}
                      {org.is_demo && (
                        <span className="ml-2 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-xs text-violet-400">demo</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[org.status] ?? ''}`}>
                        {org.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PLAN_STYLES[org.plan] ?? ''}`}>
                        {org.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{org.user_count}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/superadmin/orgs/${org.id}`}
                        className="text-xs text-amber-500 hover:text-amber-400"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterTab({ href, label, active }: { href: string; label: string; active: boolean }) {
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
