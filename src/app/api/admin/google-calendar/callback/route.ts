import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, decodeIdTokenEmail } from '@/lib/google-calendar';

interface ProfileRecord { org_id: string; role: string; }

const STATE_COOKIE = 'gcal_oauth_state';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  function redirectWith(query: string) {
    return NextResponse.redirect(`${APP_URL}/admin/bookings/hours?${query}`);
  }

  if (error) return redirectWith(`gcal=error&reason=${encodeURIComponent(error)}`);
  if (!code) return redirectWith('gcal=error&reason=missing_code');
  if (!state || !expectedState || state !== expectedState) {
    return redirectWith('gcal=error&reason=state_mismatch');
  }

  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirectWith('gcal=error&reason=not_signed_in');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();
  if (!profile?.org_id || (profile.role !== 'admin' && profile.role !== 'manager')) {
    return redirectWith('gcal=error&reason=forbidden');
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (err) {
    console.error('Google token exchange failed:', err);
    return redirectWith('gcal=error&reason=token_exchange');
  }

  if (!tokens.refresh_token) {
    // Google only returns refresh_token on first consent. If user has
    // previously consented without a revoke, they'll need to disconnect
    // in the Google Account permissions screen, then retry.
    return redirectWith('gcal=error&reason=no_refresh_token');
  }

  const email = decodeIdTokenEmail(tokens.id_token);

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error: upsertErr } = await service.from('google_calendar_connections').upsert({
    org_id: profile.org_id,
    google_email: email ?? 'unknown',
    refresh_token: tokens.refresh_token,
    calendar_id: 'primary',
    scope: tokens.scope,
    connected_by: user.id,
    connected_at: new Date().toISOString(),
  });
  if (upsertErr) {
    console.error('Failed to save google calendar connection:', upsertErr);
    return redirectWith('gcal=error&reason=db_save');
  }

  return redirectWith('gcal=connected');
}
