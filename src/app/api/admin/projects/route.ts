import { randomUUID } from 'crypto';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface ProfileRecord {
  org_id: string;
  is_admin: boolean;
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching authenticated user in project create route:', userError);
    return NextResponse.json({ error: 'Unable to verify current session.' }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, is_admin')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError) {
    console.error('Error loading admin profile in project create route:', profileError);
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }

  if (!profile || !profile.is_admin) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Project name is required.' }, { status: 400 });
  }

  const name = body.name.trim();

  if (!name) {
    return NextResponse.json({ error: 'Project name cannot be empty.' }, { status: 400 });
  }

  const projectId = randomUUID();

  const { error: insertError } = await supabase.from('projects').insert({
    id: projectId,
    name,
    org_id: profile.org_id,
    created_by: user.id,
  });

  if (insertError) {
    console.error('Error creating project:', insertError);
    return NextResponse.json({ error: 'Unable to create project.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, projectId });
}
