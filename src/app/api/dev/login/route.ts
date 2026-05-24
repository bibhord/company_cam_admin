/**
 * Dev-only login: bypasses CAPTCHA by using the Supabase admin API to
 * generate and immediately consume a magic link. Returns 404 in production
 * so it can't be hit on the live site.
 */
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const { email } = await req.json().catch(() => ({}));
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });
  }

  const service = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (error || !data?.properties?.hashed_token) {
    return NextResponse.json({ error: error?.message ?? 'Failed to generate link' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: data.properties.hashed_token,
  });

  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
