import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { notifyNewSignup } from '@/lib/notify-signup';

export async function POST(req: Request) {
  const { email, password, first_name, last_name, captchaToken, source } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
    return NextResponse.json({ error: 'Please complete the CAPTCHA.' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  // Supabase will send a confirmation email if "Confirm email" is enabled in the dashboard
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: first_name || null,
        last_name: last_name || null,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.captureyourwork.com'}${source === 'web' ? '/login' : '/m/login'}?verified=true`,
      captchaToken,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Supabase's anti-enumeration behavior: when signUp is called with an
  // email that's ALREADY registered, it returns a user object with an
  // empty `identities` array instead of erroring. Treat that as a duplicate.
  if (data.user && (data.user.identities ?? []).length === 0) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Please sign in or reset your password.' },
      { status: 409 },
    );
  }

  // Use service role client to bypass RLS for creating org + profile
  if (data.user) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Belt-and-suspenders: also check for an existing profile row. This
      // catches the edge case where signUp returned a non-empty identities
      // array but we already provisioned this user (e.g. a retry after
      // partial failure).
      const { data: existingProfile } = await serviceClient
        .from('profiles')
        .select('user_id')
        .eq('user_id', data.user.id)
        .maybeSingle<{ user_id: string }>();

      if (existingProfile) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in or reset your password.' },
          { status: 409 },
        );
      }

      const displayName = [first_name, last_name].filter(Boolean).join(' ') || email;
      const orgName = displayName !== email
        ? `${displayName}'s (${email}) Organization`
        : `${email}'s Organization`;
      const { data: org, error: orgError } = await serviceClient
        .from('organizations')
        .insert({ name: orgName })
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
        // Profile insert failed — roll back the org we just created so we
        // don't leave orphans. Most likely a duplicate user_id from a race.
        console.error('Error creating profile, rolling back org:', profileError);
        await serviceClient.from('organizations').delete().eq('id', org.id);
        return NextResponse.json(
          { error: 'Unable to create account. Please try again.' },
          { status: 500 },
        );
      }

      await notifyNewSignup(email, displayName);
    }
  }

  return NextResponse.json({ success: true, email_verification_required: true });
}
