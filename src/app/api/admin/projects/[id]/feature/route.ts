import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role, is_admin')
    .eq('user_id', user.id)
    .maybeSingle<{ org_id: string; role: string; is_admin: boolean }>();

  if (!profile?.org_id) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  if (!profile.is_admin && profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin required.' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.featured !== 'boolean') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error } = await svc
    .from('projects')
    .update({ featured: body.featured })
    .eq('id', id)
    .eq('org_id', profile.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
