import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const next = requestUrl.searchParams.get('next') ?? '/m/login?verified=true';

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/m/login?error=invalid_link', requestUrl.origin));
  }

  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    console.error('Email confirm error:', error);
    return NextResponse.redirect(new URL(`/m/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
