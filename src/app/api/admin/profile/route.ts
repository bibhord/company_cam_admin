import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type OrgRole = 'admin' | 'manager' | 'standard' | 'restricted';

interface ProfileRecord {
  user_id: string;
  org_id: string | null;
  role: OrgRole;
}

const allowedRoles: OrgRole[] = ['admin', 'manager', 'standard', 'restricted'];

export async function PUT(request: Request) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching user in profile route:', userError);
    return NextResponse.json({ error: 'Unable to verify session.' }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, org_id, role')
    .eq('user_id', user.id)
    .maybeSingle<ProfileRecord>();

  if (profileError) {
    console.error('Error loading profile in profile route:', profileError);
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const firstName = typeof body.first_name === 'string' ? body.first_name.trim() : '';
  const lastName = typeof body.last_name === 'string' ? body.last_name.trim() : '';
  const requestedRole = body.role as OrgRole | undefined;

  const nextRole =
    requestedRole && allowedRoles.includes(requestedRole) && (profile.role === 'admin' || profile.role === 'manager')
      ? requestedRole
      : profile.role;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      first_name: firstName || null,
      last_name: lastName || null,
      role: nextRole,
      is_admin: nextRole === 'admin' || nextRole === 'manager',
    })
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Error updating profile:', updateError);
    return NextResponse.json({ error: 'Unable to save profile.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
