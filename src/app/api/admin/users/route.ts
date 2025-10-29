import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface ProfileRecord {
  org_id: string;
  is_admin: boolean;
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
    .select('org_id, is_admin')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError) {
    console.error('Error loading admin profile in invite route:', profileError);
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }

  if (!profile || !profile.is_admin) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const isAdmin = Boolean(body.isAdmin);
  const isActive = body.isActive === undefined ? true : Boolean(body.isActive);

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
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

  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: {
      org_id: profile.org_id,
      first_name: firstName || null,
      last_name: lastName || null,
      is_admin: isAdmin,
      is_active: isActive,
    },
  });

  if (inviteError) {
    console.error('Error inviting user via Supabase:', inviteError);
    return NextResponse.json({ error: inviteError.message || 'Unable to invite user.' }, { status: 500 });
  }

  const invitedUser = inviteData?.user;

  if (!invitedUser) {
    return NextResponse.json({ error: 'Invite succeeded but user information was unavailable.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId: invitedUser.id });
}
