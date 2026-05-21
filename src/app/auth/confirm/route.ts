import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const next = requestUrl.searchParams.get('next') ?? '/m/login?verified=true';

  // Decide whether to send users to the mobile or desktop expired page
  const isMobile = next.startsWith('/m');
  const expiredUrl = new URL('/auth/link-expired', requestUrl.origin);
  if (type) expiredUrl.searchParams.set('type', type);
  if (isMobile) expiredUrl.searchParams.set('mobile', '1');

  if (!token_hash || !type) {
    return NextResponse.redirect(expiredUrl);
  }

  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    console.error('Email confirm error:', error);
    return NextResponse.redirect(expiredUrl);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
