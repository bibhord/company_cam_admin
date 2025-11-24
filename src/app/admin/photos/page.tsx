import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { PhotoRecord, ProjectRecord } from '../types';
import { PhotosClient } from './photos-client';

interface ProfileRecord {
  org_id: string;
  role: 'admin' | 'manager' | 'standard' | 'restricted';
}

export default async function PhotosPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not found for photos page');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) {
    console.error('Error loading profile for photos:', profileError);
    return (
      <div className="p-10">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-red-600">Unable to load workspace</h1>
          <p className="mt-2 text-sm text-slate-600">
            Please check your Supabase policies and try again.
          </p>
        </div>
      </div>
    );
  }

  const isAdmin = profile.role === 'admin';
  const canEdit = isAdmin || profile.role === 'manager';

  let projectsQuery = supabase
    .from('projects')
    .select('id, name')
    .eq('org_id', profile.org_id)
    .order('name', { ascending: true });

  if (!isAdmin) {
    projectsQuery = projectsQuery.eq('created_by', user.id);
  }

  const { data: projects } = await projectsQuery;

  let photosQuery = supabase
    .from('photos')
    .select(
      `
        id,
        name,
        url,
        created_at,
        project_id,
        object_key,
        notes,
        tags,
        upload_status,
        status,
        created_by,
        projects ( name )
      `
    )
    .eq('org_id', profile.org_id);

  if (!isAdmin) {
    photosQuery = photosQuery.eq('created_by', user.id);
  }

  const { data: photos, error: photosError } = await photosQuery.order('created_at', { ascending: false });

  if (photosError) {
    console.error('Error fetching photos:', photosError);
    return (
      <div className="p-10">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-red-600">Unable to load photos</h1>
          <p className="mt-2 text-sm text-slate-600">
            Confirm that your Supabase policies allow reading photos for this organization.
          </p>
        </div>
      </div>
    );
  }

  const rawPhotoRecords = (photos ?? []) as PhotoRecord[];
  const storage = supabase.storage.from('photos');
  const enrichedPhotos = await Promise.all(
    rawPhotoRecords.map(async (photo) => {
      if (!photo.object_key) {
        return { ...photo, signedUrl: null };
      }

      try {
        const { data: signed, error: signedError } = await storage.createSignedUrl(photo.object_key, 60 * 60);
        if (signedError) {
          console.error(`Error generating signed URL for photo ${photo.id}:`, signedError);
          return { ...photo, signedUrl: null };
        }
        return { ...photo, signedUrl: signed?.signedUrl ?? null };
      } catch (error) {
        console.error(`Unexpected error generating signed URL for photo ${photo.id}:`, error);
        return { ...photo, signedUrl: null };
      }
    })
  );

  const accessibleProjects = (projects ?? []) as Pick<ProjectRecord, 'id' | 'name'>[];
  const accessibleProjectIds = new Set(accessibleProjects.map((project) => project.id));
  const visiblePhotos = isAdmin
    ? enrichedPhotos
    : enrichedPhotos.filter((photo) => !photo.project_id || accessibleProjectIds.has(photo.project_id));

  return (
    <PhotosClient
      canEdit={canEdit}
      photos={visiblePhotos}
      projects={accessibleProjects}
    />
  );
}
