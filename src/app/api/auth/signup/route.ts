import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
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

  // Use service role client to bypass RLS for creating org + profile
  if (data.user) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Create a personal organization for the new user
      const displayName = [first_name, last_name].filter(Boolean).join(' ') || email;
      const { data: org, error: orgError } = await serviceClient
        .from('organizations')
        .insert({ name: `${displayName}'s Organization` })
        .select('id')
        .single();

      if (orgError) {
        console.error('Error creating organization:', orgError);
        return NextResponse.json({ error: 'Unable to create account.' }, { status: 500 });
      }

      const { error: profileError } = await serviceClient.from('profiles').insert({
        user_id: data.user.id,
        org_id: org.id,
        first_name: first_name || null,
        last_name: last_name || null,
        role: 'admin',
        is_admin: true,
        is_active: true,
        onboarding_complete: false,
      });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }
  }

  return NextResponse.json({ success: true });
}
