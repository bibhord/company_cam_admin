import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
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

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingProfile) {
    // Update existing profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating profile during onboarding:', updateError);
      return NextResponse.json({ error: 'Unable to save preferences.' }, { status: 500 });
    }
  } else {
    // Create new profile for Google OAuth users who don't have one yet
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        first_name: user.user_metadata?.full_name?.split(' ')[0] ?? null,
        last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') ?? null,
        role: 'standard',
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
