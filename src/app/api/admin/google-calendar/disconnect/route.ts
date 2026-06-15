import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { revokeRefreshToken } from '@/lib/google-calendar';

interface ProfileRecord { org_id: string; role: string; }

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();
  if (!profile?.org_id || (profile.role !== 'admin' && profile.role !== 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: conn } = await service
    .from('google_calendar_connections')
    .select('refresh_token')
    .eq('org_id', profile.org_id)
    .maybeSingle<{ refresh_token: string }>();

  if (conn?.refresh_token) {
    await revokeRefreshToken(conn.refresh_token);
  }

  await service.from('google_calendar_connections').delete().eq('org_id', profile.org_id);

  return NextResponse.json({ ok: true });
}
