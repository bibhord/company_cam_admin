import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null) as { subscription_id?: string; platform?: string } | null;
  const subscriptionId = body?.subscription_id;
  if (!subscriptionId) return NextResponse.json({ error: 'Missing subscription_id' }, { status: 400 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle<{ org_id: string }>();
  if (!profile?.org_id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  await supabase.from('push_devices').upsert(
    {
      user_id: user.id,
      org_id: profile.org_id,
      push_token: subscriptionId,
      platform: body?.platform ?? 'web',
      device_id: subscriptionId,
      last_seen: new Date().toISOString(),
    },
    { onConflict: 'push_token' },
  );

  return NextResponse.json({ ok: true });
}
