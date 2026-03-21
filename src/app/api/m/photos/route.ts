import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface ProfileRecord {
  org_id: string;
}

interface PhotoRecord {
  id: string;
  object_key: string;
  name: string;
  org_id: string;
  project_id: string | null;
  created_by: string;
  status: string;
  upload_status: string;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  projects: { name: string } | null;
}

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching authenticated user in m/photos route:', userError);
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
    console.error('Error loading profile in m/photos route:', profileError);
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }

  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('*, projects(name)')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  if (photosError) {
    console.error('Error fetching photos:', photosError);
    return NextResponse.json({ error: 'Unable to fetch photos.' }, { status: 500 });
  }

  const photosWithUrls = await Promise.all(
    (photos as PhotoRecord[]).map(async (photo) => {
      const { data: signedUrlData } = await supabase.storage
        .from('photos')
        .createSignedUrl(photo.object_key, 3600);

      return {
        ...photo,
        project_name: photo.projects?.name ?? null,
        signed_url: signedUrlData?.signedUrl ?? null,
        projects: undefined,
      };
    })
  );

  return NextResponse.json(photosWithUrls);
}
