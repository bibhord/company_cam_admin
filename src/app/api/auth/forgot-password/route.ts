import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { email, captchaToken, mobile } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
    return NextResponse.json({ error: 'Please complete the CAPTCHA.' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://app.captureyourwork.com';
  const next = mobile ? '/m/reset-password' : '/reset-password';
  const redirectTo = `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
    captchaToken,
  });

  if (error) {
    // Don't leak whether the email exists — return success anyway in non-debug envs
    console.error('resetPasswordForEmail error:', error);
  }

  return NextResponse.json({ success: true });
}
