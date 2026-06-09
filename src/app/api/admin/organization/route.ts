import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface ProfileRecord {
  org_id: string;
  role: string;
}

export async function PATCH(request: Request) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 404 });
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const updates: Record<string, string> = {};
  if (typeof body.name === 'string') {
    const trimmed = body.name.trim();
    if (trimmed.length === 0) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    if (trimmed.length > 200) return NextResponse.json({ error: 'Name too long' }, { status: 400 });
    updates.name = trimmed;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', profile.org_id)
    .select('id, name')
    .single();

  if (error) {
    console.error('Failed to update organization:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json(data);
}
