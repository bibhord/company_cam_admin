import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface BusinessHoursRow {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
  org_id?: string;
}

const DEFAULT_HOURS: BusinessHoursRow[] = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  open_time: '09:00',
  close_time: '17:00',
  is_closed: i === 0, // Sunday closed by default
}));

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle<{ org_id: string }>();
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data } = await supabase
    .from('business_hours')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('day_of_week');

  // Fill in missing days with defaults
  const result = DEFAULT_HOURS.map((def) => {
    const existing = (data ?? []).find(
      (r: BusinessHoursRow) => r.day_of_week === def.day_of_week,
    );
    return existing ?? { ...def, org_id: profile.org_id };
  });
  return NextResponse.json(result);
}

export async function PUT(req: Request) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .maybeSingle<{ org_id: string; role: string }>();
  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as BusinessHoursRow[] | null;
  if (!Array.isArray(body)) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const rows = body.map((r) => ({ ...r, org_id: profile.org_id }));
  const { error } = await supabase
    .from('business_hours')
    .upsert(rows, { onConflict: 'org_id,day_of_week' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
