import { createClient } from '@supabase/supabase-js';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LogoutButton } from '../logout-button';
import type { ProfileRow } from '../types';
import { UserForm } from './user-form';

interface ProfileRecord {
  org_id: string;
  is_admin: boolean;
}

export default async function ManageUsersPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching authenticated user:', userError);
  }

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, is_admin')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError) {
    console.error('Error loading profile:', profileError);
    return (
      <div className="p-8 text-red-500">
        Unable to load profile information. Please verify your Supabase policies and try again.
      </div>
    );
  }

  if (!profile || !profile.is_admin) {
    return (
      <div className="p-8 text-red-500">
        You do not have permission to manage organization users.
      </div>
    );
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, is_admin, is_active, org_id, created_at')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  if (profilesError) {
    console.error('Error loading organization users:', profilesError);
    return (
      <div className="p-8 text-red-500">
        Unable to load organization members. Please confirm your row-level security policies.
      </div>
    );
  }

  const profileRows = (profiles ?? []) as ProfileRow[];

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const userMeta = new Map<
    string,
    {
      email: string | null;
      lastSignInAt: string | null;
    }
  >();

  if (serviceRoleKey && supabaseUrl && profileRows.length > 0) {
    try {
      const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const ids = profileRows.map((row) => row.user_id);
      const { data: listData, error: listError } = await serviceClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (listError) {
        console.error('Error fetching auth users for manage users page:', listError);
      } else if (listData?.users) {
        for (const authUser of listData.users) {
          if (ids.includes(authUser.id)) {
            userMeta.set(authUser.id, {
              email: authUser.email ?? null,
              lastSignInAt: authUser.last_sign_in_at ?? null,
            });
          }
        }
      }
    } catch (error) {
      console.error('Unexpected error fetching auth users for manage users page:', error);
    }
  } else {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not configured; user emails will be hidden.');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              <Link href="/admin" className="text-indigo-600 hover:text-indigo-700">
                ← Back to dashboard
              </Link>
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Organization Users</h1>
            <p className="mt-2 text-sm text-gray-600">
              Invite new teammates and manage their access.
            </p>
          </div>
          <LogoutButton />
        </header>

        <UserForm />

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Current Members</h2>
          {profileRows.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">No users have been added to this organization yet.</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">
                      Name
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">
                      Email
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">
                      Role
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">
                      Added
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {profileRows.map((row) => {
                    const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
                    const statusLabel = row.is_active ? 'Active' : 'Inactive';
                    const roleLabel = row.is_admin ? 'Admin' : 'User';
                    const meta = userMeta.get(row.user_id);
                    const email = meta?.email ?? '—';
                    const lastSignIn = meta?.lastSignInAt
                      ? new Date(meta.lastSignInAt).toLocaleDateString()
                      : 'Never';
                    return (
                      <tr key={row.user_id}>
                        <td className="px-4 py-3 text-gray-900">{fullName || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">
                          <div className="flex flex-col">
                            <span>{email}</span>
                            <span className="text-xs text-gray-400">Last login: {lastSignIn}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{roleLabel}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                              row.is_active
                                ? 'bg-green-50 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${row.is_active ? 'bg-green-500' : 'bg-gray-400'}`}
                              aria-hidden
                            />
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
