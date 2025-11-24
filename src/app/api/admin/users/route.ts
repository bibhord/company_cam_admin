import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface ProfileRecord {
  org_id: string;
  role: 'admin' | 'manager' | 'standard' | 'restricted';
}

type OrgRole = 'admin' | 'manager' | 'standard' | 'restricted';

interface InvitePayload {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: OrgRole;
  isActive?: boolean;
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching authenticated user in invite route:', userError);
    return NextResponse.json({ error: 'Unable to verify current session.' }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError) {
    console.error('Error loading admin profile in invite route:', profileError);
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }

  const canManageUsers = profile?.role === 'admin' || profile?.role === 'manager';

  if (!profile || !canManageUsers) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const invites: InvitePayload[] = Array.isArray(body.invites)
    ? body.invites
    : [
        {
          email: typeof body.email === 'string' ? body.email : '',
          firstName: body.firstName,
          lastName: body.lastName,
          role: body.role,
          isActive: body.isActive,
        },
      ];

  const normalizedInvites = invites
    .map((invite) => ({
      email: typeof invite.email === 'string' ? invite.email.trim().toLowerCase() : '',
      firstName: typeof invite.firstName === 'string' ? invite.firstName.trim() : '',
      lastName: typeof invite.lastName === 'string' ? invite.lastName.trim() : '',
      role: (invite.role as OrgRole) ?? 'standard',
      isActive: invite.isActive === undefined ? true : Boolean(invite.isActive),
    }))
    .filter((invite) => invite.email.length > 0);

  if (normalizedInvites.length === 0) {
    return NextResponse.json({ error: 'At least one valid email is required.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase service role configuration.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const results: Array<{ email: string; success: boolean; error?: string }> = [];

  for (const invite of normalizedInvites) {
    try {
      const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
        invite.email,
        {
          data: {
            org_id: profile.org_id,
            first_name: invite.firstName || null,
            last_name: invite.lastName || null,
            role: invite.role,
            is_active: invite.isActive,
          },
        }
      );

      if (inviteError) {
        results.push({
          email: invite.email,
          success: false,
          error: inviteError.message || 'Failed to send invite.',
        });
        continue;
      }

      const invitedUser = inviteData?.user;
      if (!invitedUser) {
        results.push({
          email: invite.email,
          success: false,
          error: 'Invite succeeded but returned no user information.',
        });
        continue;
      }

      const profilePayload = {
        user_id: invitedUser.id,
        org_id: profile.org_id,
        first_name: invite.firstName || null,
        last_name: invite.lastName || null,
        is_admin: invite.role === 'admin' || invite.role === 'manager',
        role: invite.role,
        is_active: invite.isActive,
        created_at: new Date().toISOString(),
      };

      const { error: profileUpsertError } = await serviceClient
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'user_id' });

      if (profileUpsertError) {
        console.error('Error upserting invited user profile:', profileUpsertError);
        results.push({
          email: invite.email,
          success: false,
          error: 'Invitation sent but failed to create profile.',
        });
        continue;
      }

      results.push({ email: invite.email, success: true });
    } catch (error: unknown) {
      console.error('Unexpected error inviting user:', error);
      const message = error instanceof Error ? error.message : 'Unexpected server error.';
      results.push({
        email: invite.email,
        success: false,
        error: message,
      });
    }
  }

  const failures = results.filter((result) => !result.success);

  if (failures.length > 0) {
    return NextResponse.json(
      {
        error: 'Some invitations failed.',
        results,
      },
      { status: 207 }
    );
  }

  return NextResponse.json({ success: true, results });
}
