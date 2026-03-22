import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { email, password, first_name, last_name } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: first_name || null,
        last_name: last_name || null,
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Create profile row for the new user
  if (data.user) {
    await supabase.from('profiles').insert({
      user_id: data.user.id,
      first_name: first_name || null,
      last_name: last_name || null,
      role: 'standard',
      is_active: true,
      onboarding_complete: false,
    });
  }

  return NextResponse.json({ success: true });
}
