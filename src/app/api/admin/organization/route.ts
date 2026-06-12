import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface ProfileRecord {
  org_id: string;
  role: string;
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const RESERVED_SLUGS = new Set(['www', 'app', 'api', 'admin', 'mail', 'staging', 'dev']);

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

  if (typeof body.portfolio_slug === 'string') {
    const slug = body.portfolio_slug.trim().toLowerCase();
    if (slug.length === 0) return NextResponse.json({ error: 'Subdomain cannot be empty' }, { status: 400 });
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json({
        error: 'Subdomain must be 1–40 chars, lowercase letters/numbers/hyphens, and cannot start or end with a hyphen.',
      }, { status: 400 });
    }
    if (RESERVED_SLUGS.has(slug)) {
      return NextResponse.json({ error: 'This subdomain is reserved.' }, { status: 400 });
    }

    // Check uniqueness across orgs
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('portfolio_slug', slug)
      .neq('id', profile.org_id)
      .maybeSingle<{ id: string }>();
    if (existing) {
      return NextResponse.json({ error: 'That subdomain is already taken.' }, { status: 409 });
    }
    updates.portfolio_slug = slug;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', profile.org_id)
    .select('id, name, portfolio_slug')
    .single();

  if (error) {
    console.error('Failed to update organization:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json(data);
}
