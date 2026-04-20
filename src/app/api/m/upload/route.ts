import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse, after } from 'next/server';
import { processWatermark } from '@/lib/watermark';
import { fireReportNudge } from '@/lib/nudge';
import { r2Upload } from '@/lib/r2';

interface ProfileRecord {
  org_id: string;
}

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching authenticated user in m/upload route:', userError);
    return NextResponse.json({ error: 'Authentication error.' }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) {
    console.error('Error loading profile in m/upload route:', profileError);
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const projectId = formData.get('projectId') as string | null;
  const photoName = (formData.get('photoName') as string | null)?.trim() || null;
  const latRaw = formData.get('lat') as string | null;
  const lonRaw = formData.get('lon') as string | null;
  const lat = latRaw ? Number(latRaw) : null;
  const lon = lonRaw ? Number(lonRaw) : null;

  if (!file) {
    return NextResponse.json({ error: 'File is required.' }, { status: 400 });
  }

  const timestamp = Date.now();
  const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const folder = projectId || 'unassigned';
  const objectKey = `${profile.org_id}/${folder}/${timestamp}_${filename}`;

  try {
    await r2Upload(objectKey, file, file.type);
  } catch (uploadError) {
    console.error('Error uploading file to R2:', uploadError);
    const message = uploadError instanceof Error ? uploadError.message : 'unknown';
    return NextResponse.json({ error: `Unable to upload file: ${message}` }, { status: 500 });
  }

  const { data: photo, error: insertError } = await supabase
    .from('photos')
    .insert({
      id: crypto.randomUUID(),
      object_key: objectKey,
      name: photoName || file.name,
      org_id: profile.org_id,
      project_id: projectId || null,
      created_by: user.id,
      status: 'active',
      upload_status: 'uploaded',
      lat: lat ?? null,
      lon: lon ?? null,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error inserting photo record:', insertError);
    return NextResponse.json({ error: `Unable to save photo record: ${insertError.message}` }, { status: 500 });
  }

  // Post-response background work: watermark + nudge
  const orgId = profile.org_id;
  const userId = user.id;
  const createdAt = photo.created_at as string;

  after(async () => {
    await Promise.allSettled([
      processWatermark({ photoId: photo.id, objectKey, orgId, lat, lon, createdAt }),
      projectId ? fireReportNudge(projectId, orgId, userId) : Promise.resolve(),
    ]);
  });

  return NextResponse.json(photo);
}
