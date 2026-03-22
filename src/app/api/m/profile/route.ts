import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, language, specialty')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({
    first_name: profile?.first_name ?? null,
    last_name: profile?.last_name ?? null,
    email: user.email ?? '',
    language: profile?.language ?? 'en',
    specialty: profile?.specialty ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: { language?: string; specialty?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.language !== undefined) updates.language = body.language;
  if (body.specialty !== undefined) updates.specialty = body.specialty;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Error updating profile:', updateError);
    return NextResponse.json({ error: 'Unable to update profile.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
