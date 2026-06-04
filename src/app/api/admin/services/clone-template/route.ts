import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { findTemplate } from '@/lib/service-templates';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('org_id, role').eq('user_id', user.id)
    .single<{ org_id: string; role: string }>();
  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 403 });
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as { template_key?: string } | null;
  const template = body?.template_key ? findTemplate(body.template_key) : undefined;
  if (!template) return NextResponse.json({ error: 'Unknown template.' }, { status: 400 });

  // Insert categories one by one to capture their IDs, then services per category.
  let createdCats = 0;
  let createdServices = 0;
  for (let ci = 0; ci < template.categories.length; ci++) {
    const cat = template.categories[ci];
    const { data: catRow, error: catErr } = await supabase
      .from('service_categories')
      .insert({ org_id: profile.org_id, name: cat.name, sort_order: ci })
      .select('id')
      .single<{ id: string }>();
    if (catErr || !catRow) {
      return NextResponse.json({ error: `Category insert failed: ${catErr?.message}` }, { status: 500 });
    }
    createdCats += 1;
    const rows = cat.services.map((s, si) => ({
      org_id: profile.org_id,
      category_id: catRow.id,
      name: s.name,
      description: s.description ?? null,
      duration_min: s.duration_min,
      price_cents: s.price_cents,
      price_type: s.price_type,
      sort_order: si,
      is_active: true,
    }));
    if (rows.length > 0) {
      const { error: svcErr } = await supabase.from('services').insert(rows);
      if (svcErr) {
        return NextResponse.json({ error: `Service insert failed: ${svcErr.message}` }, { status: 500 });
      }
      createdServices += rows.length;
    }
  }

  return NextResponse.json({ ok: true, categories: createdCats, services: createdServices });
}
