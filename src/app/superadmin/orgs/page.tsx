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

export default async function OrgsPage() {
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Load orgs + user count via subquery
  const { data: orgs } = await svc
    .from('organizations')
    .select('id, name, status, plan, trial_ends_at, created_at')
    .order('created_at', { ascending: false });

  // Get user counts per org
  const { data: profileCounts } = await svc
    .from('profiles')
    .select('org_id');

  const countMap: Record<string, number> = {};
  for (const p of profileCounts ?? []) {
    countMap[p.org_id] = (countMap[p.org_id] ?? 0) + 1;
  }

  const rows: OrgRow[] = (orgs ?? []).map((o) => ({
    ...o,
    user_count: countMap[o.id] ?? 0,
  }));

  const pending = rows.filter((o) => o.status === 'pending');
  const rest = rows.filter((o) => o.status !== 'pending');

  const sections = [
    ...(pending.length > 0 ? [{ label: `Pending Approval (${pending.length})`, orgs: pending }] : []),
    { label: 'All Organizations', orgs: rest },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100">Organizations</h1>
      <p className="mt-1 text-sm text-slate-500">{rows.length} total</p>

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
                    <td className="px-5 py-3 font-medium text-slate-100">{org.name}</td>
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
