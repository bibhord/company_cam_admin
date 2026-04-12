import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface OrgRow {
  id: string;
  name: string;
  status: string;
  plan: string;
  created_at: string;
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-100">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default async function SuperAdminDashboard() {
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: orgs } = await svc
    .from('organizations')
    .select('id, name, status, plan, created_at')
    .order('created_at', { ascending: false });

  const allOrgs = (orgs ?? []) as OrgRow[];

  const pending = allOrgs.filter((o) => o.status === 'pending');
  const active = allOrgs.filter((o) => o.status === 'active');
  const suspended = allOrgs.filter((o) => o.status === 'suspended');
  const trial = allOrgs.filter((o) => o.plan === 'trial');
  const pro = allOrgs.filter((o) => o.plan === 'pro');

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentSignups = allOrgs.filter((o) => o.created_at > sevenDaysAgo);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Platform-wide overview</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Orgs" value={allOrgs.length} />
        <StatCard label="Pending Approval" value={pending.length} sub="need review" />
        <StatCard label="Active" value={active.length} />
        <StatCard label="Suspended" value={suspended.length} />
        <StatCard label="On Trial" value={trial.length} />
        <StatCard label="Pro" value={pro.length} />
        <StatCard label="New this week" value={recentSignups.length} />
      </div>

      {pending.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-500">
            Pending Approval ({pending.length})
          </h2>
          <div className="divide-y divide-slate-800 rounded-xl border border-amber-500/30 bg-slate-900 overflow-hidden">
            {pending.map((org) => (
              <div key={org.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">{org.name}</p>
                  <p className="text-xs text-slate-500">
                    Signed up {new Date(org.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/superadmin/orgs/${org.id}`}
                  className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Recent Signups</h2>
          <Link href="/superadmin/orgs" className="text-xs text-amber-500 hover:text-amber-400">View all →</Link>
        </div>
        <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          {recentSignups.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">No new signups this week.</p>
          ) : (
            recentSignups.slice(0, 8).map((org) => (
              <div key={org.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">{org.name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(org.created_at).toLocaleDateString()} · {org.plan}
                  </p>
                </div>
                <StatusBadge status={org.status} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-400',
    active: 'bg-emerald-500/20 text-emerald-400',
    suspended: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status] ?? 'bg-slate-700 text-slate-300'}`}>
      {status}
    </span>
  );
}
