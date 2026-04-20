import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { r2SignedUrl } from '@/lib/r2';

type OrgRole = 'admin' | 'manager' | 'standard' | 'restricted';

interface ProfileRecord {
  org_id: string;
  role: OrgRole;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching authenticated user in m/projects/[id] route:', userError);
    return NextResponse.json({ error: 'Authentication error.' }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) {
    console.error('Error loading profile in m/projects/[id] route:', profileError);
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, street_address, city, state_zip, status, created_at, updated_at')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }

  const { count, error: countError } = await supabase
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', id)
    .eq('org_id', profile.org_id);

  if (countError) {
    console.error('Error fetching photo count for project:', countError);
  }

  // Fetch project photos with signed URLs
  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('id, name, object_key, notes, created_at')
    .eq('project_id', id)
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  if (photosError) {
    console.error('Error fetching project photos:', photosError);
  }

  const photosWithUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
      let signedUrl: string | null = null;
      try {
        signedUrl = await r2SignedUrl(photo.object_key, 3600);
      } catch (err) {
        console.error('Error generating signed URL for photo', photo.id, err);
      }
      return {
        id: photo.id,
        name: photo.name,
        notes: photo.notes,
        created_at: photo.created_at,
        signed_url: signedUrl,
      };
    })
  );

  return NextResponse.json({
    ...project,
    photo_count: count ?? 0,
    photos: photosWithUrls,
  });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching authenticated user in m/projects/[id] PUT:', userError);
    return NextResponse.json({ error: 'Authentication error.' }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) {
    console.error('Error loading profile in m/projects/[id] PUT:', profileError);
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }

  if (!(profile.role === 'admin' || profile.role === 'manager')) {
    return NextResponse.json({ error: 'Forbidden. Admin or manager role required.' }, { status: 403 });
  }

  let body: { name?: string; street_address?: string; city?: string; state_zip?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.street_address !== undefined) updates.street_address = body.street_address.trim();
  if (body.city !== undefined) updates.city = body.city.trim();
  if (body.state_zip !== undefined) updates.state_zip = body.state_zip.trim();
  const validStatuses = ['not_started', 'in_progress', 'blocked', 'completed'];
  if (body.status !== undefined && validStatuses.includes(body.status)) updates.status = body.status;

  const { data: updated, error: updateError } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .select('id, name, street_address, city, state_zip, status, created_at, updated_at')
    .single();

  if (updateError) {
    console.error('Error updating project:', updateError);
    return NextResponse.json({ error: 'Unable to update project.' }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
