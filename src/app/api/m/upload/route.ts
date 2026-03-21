import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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

  if (!file) {
    return NextResponse.json({ error: 'File is required.' }, { status: 400 });
  }

  const timestamp = Date.now();
  const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const folder = projectId || 'unassigned';
  const objectKey = `${profile.org_id}/${folder}/${timestamp}_${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(objectKey, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('Error uploading file to storage:', uploadError);
    return NextResponse.json({ error: 'Unable to upload file.' }, { status: 500 });
  }

  const { data: photo, error: insertError } = await supabase
    .from('photos')
    .insert({
      object_key: objectKey,
      name: file.name,
      org_id: profile.org_id,
      project_id: projectId || null,
      created_by: user.id,
      status: 'active',
      upload_status: 'complete',
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error inserting photo record:', insertError);
    return NextResponse.json({ error: 'Unable to save photo record.' }, { status: 500 });
  }

  return NextResponse.json(photo);
}
