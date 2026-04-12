import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PendingApprovalPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, organizations(status, name)')
    .eq('user_id', user.id)
    .maybeSingle<{ org_id: string; organizations: { status: string; name: string } | null }>();

  // If org is now active, let them through
  if (profile?.organizations?.status === 'active') redirect('/admin');

  const isSuspended = profile?.organizations?.status === 'suspended';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-sm text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          {isSuspended ? (
            <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ) : (
            <svg className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          )}
        </div>

        <h1 className="text-xl font-bold text-slate-900">
          {isSuspended ? 'Account Suspended' : 'Awaiting Approval'}
        </h1>

        <p className="mt-3 text-sm text-slate-600">
          {isSuspended
            ? 'Your account has been suspended. Please contact support for assistance.'
            : "Your account is pending review. We'll activate it shortly — usually within one business day."}
        </p>

        <p className="mt-2 text-xs text-slate-400">
          {profile?.organizations?.name}
        </p>

        <div className="mt-8 space-y-2">
          {!isSuspended && (
            <form action="/admin">
              <button
                type="submit"
                className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Check again
              </button>
            </form>
          )}
          <Link
            href="/api/auth/logout"
            className="block w-full rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </Link>
        </div>
      </div>
    </div>
  );
}
