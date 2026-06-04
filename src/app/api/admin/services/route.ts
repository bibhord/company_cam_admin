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

export async function GET() {
  const ctx = await loadOrg();
  if ('error' in ctx) return ctx.error;
  const { supabase, orgId } = ctx;
  const [{ data: categories }, { data: services }] = await Promise.all([
    supabase.from('service_categories').select('*').eq('org_id', orgId).order('sort_order').order('name'),
    supabase.from('services').select('*').eq('org_id', orgId).order('sort_order').order('name'),
  ]);
  return NextResponse.json({ categories: categories ?? [], services: services ?? [] });
}

export async function POST(req: Request) {
  const ctx = await loadOrg();
  if ('error' in ctx) return ctx.error;
  const { supabase, orgId, role } = ctx;
  if (role !== 'admin' && role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }
  const insert = {
    org_id: orgId,
    name: body.name.trim(),
    description: typeof body.description === 'string' ? body.description.trim() || null : null,
    duration_min: Number.isInteger(body.duration_min) && body.duration_min > 0 ? body.duration_min : 30,
    price_cents: body.price_cents == null ? null : Number(body.price_cents),
    price_type: body.price_type === 'from' ? 'from' : 'fixed',
    is_active: body.is_active !== false,
    sort_order: Number.isInteger(body.sort_order) ? body.sort_order : 0,
    category_id: body.category_id ?? null,
  };
  const { data, error } = await supabase.from('services').insert(insert).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
