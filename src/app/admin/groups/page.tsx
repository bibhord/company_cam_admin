import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import type { ProfileRow } from '../types';
import { CreateGroupDialog } from './create-group-dialog';

interface ProfileRecord {
  org_id: string;
  role: 'admin' | 'manager' | 'standard' | 'restricted';
}

interface GroupRow {
  id: string;
  name: string;
  created_at: string;
}

interface GroupMemberRow {
  group_id: string;
  user_id: string;
  profiles?: Array<{
    first_name: string | null;
    last_name: string | null;
    role: string | null;
  }> | null;
}

export default async function GroupsPage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not found for groups page');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) {
    console.error('Error loading profile for groups:', profileError);
    return (
      <div className="p-10">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-red-600">Unable to load workspace</h1>
          <p className="mt-2 text-sm text-slate-600">
            Check your Supabase policies and ensure your profile is configured.
          </p>
        </div>
      </div>
    );
  }

  const canManageGroups = profile.role === 'admin' || profile.role === 'manager';

  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id, name, created_at')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  if (groupsError) {
    console.error('Error loading groups:', groupsError);
    if (groupsError.code === '42P01') {
      return (
        <div className="p-10">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">Groups setup required</h1>
            <p className="mt-2 text-sm text-slate-600">
              The <code>groups</code> table was not found. Ensure your Supabase migration for user groups has been applied.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="p-10">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-red-600">Unable to load groups</h1>
          <p className="mt-2 text-sm text-slate-600">
            {groupsError.message}
          </p>
        </div>
      </div>
    );
  }

  const groupRows = (groups ?? []) as GroupRow[];
  const groupIds = groupRows.map((group) => group.id);

  let memberRows: GroupMemberRow[] = [];
  if (groupIds.length > 0) {
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('group_id, user_id, profiles(first_name,last_name,role)')
      .in('group_id', groupIds);

    if (membersError) {
      console.error('Error loading group members:', membersError);
    } else {
      memberRows = (members ?? []) as GroupMemberRow[];
    }
  }

  const membersByGroup = new Map<string, GroupMemberRow[]>();
  for (const member of memberRows) {
    const list = membersByGroup.get(member.group_id) ?? [];
    list.push(member);
    membersByGroup.set(member.group_id, list);
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, role, is_active')
    .eq('org_id', profile.org_id)
    .order('first_name', { ascending: true });

  return (
    <div className="px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Groups</h1>
          <p className="mt-1 text-sm text-slate-600">
            Organize teammates into groups to quickly assign project access and review photo contributions.
          </p>
        </div>
        {canManageGroups ? (
          <CreateGroupDialog
            users={(profiles ?? []) as ProfileRow[]}
            orgId={profile.org_id}
          />
        ) : null}
      </div>

      {groupRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No groups yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Create your first group to bundle teammates and streamline project sharing.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {groupRows.map((group) => {
            const members = membersByGroup.get(group.id) ?? [];
            return (
              <div key={group.id} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{group.name}</h2>
                    <p className="text-xs text-slate-500">
                      Created {new Date(group.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600">
                    {members.length} members
                  </span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {members.length === 0 ? (
                    <li className="text-slate-500">No members yet.</li>
                  ) : (
                    members.map((member) => {
                      const profile = member.profiles?.[0];
                      const fullName =
                        [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Unnamed user';
                      const role = profile?.role ?? 'standard';
                      return (
                        <li key={member.user_id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                          <span>{fullName}</span>
                          <span className="text-xs uppercase tracking-wide text-slate-500">{role}</span>
                        </li>
                      );
                    })
                  )}
                </ul>
                <div className="mt-4 flex gap-2 text-sm text-indigo-600">
                  <Link href={`/admin/groups/${group.id}`} className="font-semibold hover:text-indigo-700">
                    View details
                  </Link>
                  {canManageGroups ? (
                    <Link href={`/admin/groups/${group.id}/edit`} className="font-semibold hover:text-indigo-700">
                      Manage
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
