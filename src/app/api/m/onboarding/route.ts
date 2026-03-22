import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: { specialty?: string; language?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    onboarding_complete: true,
  };
  if (body.specialty) updates.specialty = body.specialty;
  if (body.language) updates.language = body.language;

  // Use service role client to bypass RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check if profile exists
  const { data: existingProfile } = await serviceClient
    .from('profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingProfile) {
    // Update existing profile
    const { error: updateError } = await serviceClient
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating profile during onboarding:', updateError);
      return NextResponse.json({ error: 'Unable to save preferences.' }, { status: 500 });
    }
  } else {
    // Create org + profile for Google OAuth users who don't have one yet
    const displayName = user.user_metadata?.full_name || user.email || 'User';
    const { data: org, error: orgError } = await serviceClient
      .from('organizations')
      .insert({ name: `${displayName}'s Organization` })
      .select('id')
      .single();

    if (orgError) {
      console.error('Error creating organization during onboarding:', orgError);
      return NextResponse.json({ error: 'Unable to create profile.' }, { status: 500 });
    }

    const { error: insertError } = await serviceClient
      .from('profiles')
      .insert({
        user_id: user.id,
        org_id: org.id,
        first_name: user.user_metadata?.full_name?.split(' ')[0] ?? null,
        last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') ?? null,
        role: 'admin',
        is_admin: true,
        is_active: true,
        ...updates,
      });

    if (insertError) {
      console.error('Error creating profile during onboarding:', insertError);
      return NextResponse.json({ error: 'Unable to create profile.' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
