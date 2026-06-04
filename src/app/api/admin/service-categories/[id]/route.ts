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

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await loadOrg();
  if ('error' in auth) return auth.error;
  if (auth.role !== 'admin' && auth.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  const updates: Record<string, unknown> = {};
  if (typeof body.name === 'string') updates.name = body.name.trim();
  if (Number.isInteger(body.sort_order)) updates.sort_order = body.sort_order;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
  }
  const { data, error } = await auth.supabase
    .from('service_categories').update(updates).eq('id', id).eq('org_id', auth.orgId)
    .select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await loadOrg();
  if ('error' in auth) return auth.error;
  if (auth.role !== 'admin' && auth.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }
  const { error } = await auth.supabase.from('service_categories').delete().eq('id', id).eq('org_id', auth.orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
