import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check if profile already exists
  const { data: existingProfile } = await serviceClient
    .from('profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingProfile) {
    return NextResponse.json({ ok: true, created: false });
  }

  // Create org + profile for new OAuth users
  const displayName = user.user_metadata?.full_name || user.email || 'User';
  const userEmail = user.email || '';
  const orgName = displayName !== userEmail && userEmail
    ? `${displayName}'s (${userEmail}) Organization`
    : `${displayName}'s Organization`;

  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .insert({ name: orgName, status: 'pending' })
    .select('id')
    .single();

  if (orgError) {
    console.error('ensure-profile: failed to create organization:', orgError);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }

  const { error: profileError } = await serviceClient.from('profiles').insert({
    user_id: user.id,
    org_id: org.id,
    first_name: user.user_metadata?.full_name?.split(' ')[0] ?? null,
    last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') ?? null,
    role: 'admin',
    is_admin: true,
    is_active: true,
    onboarding_complete: false,
  });

  if (profileError) {
    console.error('ensure-profile: failed to create profile:', profileError);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: true });
}
