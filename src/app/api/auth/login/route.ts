// src/app/api/auth/login/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { email, password, captchaToken } = await req.json();
  const isNative = req.headers.get('x-capacitor-native') === '1';

  if (!isNative && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
    return NextResponse.json({ error: 'Please complete the CAPTCHA.' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const { data: { user }, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: isNative ? undefined : { captchaToken },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_active')
    .eq('user_id', user?.id)
    .maybeSingle();

  return NextResponse.json({
    success: true,
    isAdmin: profile?.is_admin ?? false,
    isActive: profile?.is_active ?? false,
  });
}
