import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface ProfileRecord {
  org_id: string;
  role: 'admin' | 'manager' | 'standard' | 'restricted';
}

/**
 * POST /api/admin/projects/[id]/share
 * Creates (or returns existing) a public share token for this project.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) return NextResponse.json({ error: 'Unable to verify session.' }, { status: 500 });
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  // Verify project belongs to this org
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('org_id', profile.org_id)
    .single();

  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });

  // Reuse an existing non-expired share if present
  const { data: existing } = await supabase
    .from('project_shares')
    .select('token')
    .eq('project_id', projectId)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ token: string }>();

  const token = existing?.token ?? (await (async () => {
    const { data: created } = await supabase
      .from('project_shares')
      .insert({ project_id: projectId, org_id: profile.org_id, created_by: user.id })
      .select('token')
      .single<{ token: string }>();
    return created?.token;
  })());

  if (!token) return NextResponse.json({ error: 'Failed to create share link.' }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  return NextResponse.json({ url: `${appUrl}/share/${token}` });
}

/**
 * DELETE /api/admin/projects/[id]/share
 * Revokes all share links for this project.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  await supabase
    .from('project_shares')
    .delete()
    .eq('project_id', projectId)
    .eq('org_id', profile.org_id);

  return NextResponse.json({ success: true });
}
