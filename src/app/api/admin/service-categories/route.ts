import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

async function loadOrg() {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) };
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<{ org_id: string; role: string }>();
  if (!profile) return { error: NextResponse.json({ error: 'Profile not found.' }, { status: 403 }) };
  return { supabase, orgId: profile.org_id, role: profile.role };
}

export async function POST(req: Request) {
  const auth = await loadOrg();
  if ('error' in auth) return auth.error;
  if (auth.role !== 'admin' && auth.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: 'Name required.' }, { status: 400 });
  const { data, error } = await auth.supabase
    .from('service_categories')
    .insert({
      org_id: auth.orgId,
      name: String(body.name).trim(),
      sort_order: Number.isInteger(body.sort_order) ? body.sort_order : 0,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
