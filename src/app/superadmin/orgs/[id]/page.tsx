import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { OrgActions } from './org-actions';
import { ImpersonateButton } from './impersonate-button';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface OrgRecord {
  id: string;
  name: string;
  status: string;
  plan: string;
  trial_ends_at: string;
  created_at: string;
  stripe_subscription_id: string | null;
}

interface UserRow {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  email?: string;
}

export default async function OrgDetailPage({ params }: RouteParams) {
  const { id: orgId } = await params;

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: org } = await svc
    .from('organizations')
    .select('id, name, status, plan, trial_ends_at, created_at, stripe_subscription_id')
    .eq('id', orgId)
    .maybeSingle<OrgRecord>();

  if (!org) notFound();

  // Load users in this org
  const { data: profiles } = await svc
    .from('profiles')
    .select('user_id, first_name, last_name, role, is_admin, is_active, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  // Load emails from auth.users via service role
  const userRows = (profiles ?? []) as UserRow[];
  const { data: authUsers } = await svc.auth.admin.listUsers();
  const emailMap: Record<string, string> = {};
  for (const u of authUsers?.users ?? []) {
    if (u.email) emailMap[u.id] = u.email;
  }
  const users = userRows.map((u) => ({ ...u, email: emailMap[u.user_id] ?? '—' }));

  // Stats
  const { count: photoCount } = await svc
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);

  const { count: projectCount } = await svc
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);

  const trialDaysLeft = org.plan === 'trial'
    ? Math.max(0, Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="max-w-4xl">
      <div className="mb-2">
        <Link href="/superadmin/orgs" className="text-xs text-amber-500 hover:text-amber-400">
          ← Organizations
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{org.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Signed up {new Date(org.created_at).toLocaleDateString()}
          </p>
        </div>
        <OrgActions orgId={org.id} currentStatus={org.status} currentPlan={org.plan} />
      </div>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoCard label="Status" value={org.status} highlight={org.status === 'pending'} />
        <InfoCard label="Plan" value={org.plan} />
        {trialDaysLeft !== null && (
          <InfoCard label="Trial days left" value={String(trialDaysLeft)} highlight={trialDaysLeft <= 3} />
        )}
        <InfoCard label="Users" value={String(users.length)} />
        <InfoCard label="Projects" value={String(projectCount ?? 0)} />
        <InfoCard label="Photos" value={String(photoCount ?? 0)} />
      </div>

      {/* Users table */}
      <div className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Users ({users.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => (
                <tr key={u.user_id} className="hover:bg-slate-800/50">
                  <td className="px-5 py-3 font-medium text-slate-100">
                    {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                    {u.is_admin && (
                      <span className="ml-2 rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-xs text-indigo-400">admin</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{u.email}</td>
                  <td className="px-4 py-3 text-slate-400">{u.role}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${u.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {u.is_active ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ImpersonateButton
                      userId={u.user_id}
                      userName={[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${highlight ? 'text-amber-400' : 'text-slate-100'}`}>{value}</p>
    </div>
  );
}
