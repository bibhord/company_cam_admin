import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { PhotoCard } from '../../photo-card';
import { LogoutButton } from '../../logout-button';
import type { PhotoRecord, ProjectRecord } from '../../types';

interface ProfileRecord {
  org_id: string;
  is_admin: boolean;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

const formatDate = (value: string | null) => {
  if (!value) {
    return 'Unknown date';
  }
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default async function ProjectDetailPage({ params }: RouteParams) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;

  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching authenticated user:', userError);
  }

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, is_admin')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError) {
    console.error('Error loading profile:', profileError);
    return (
      <div className="p-8 text-red-500">
        Unable to load profile information. Please verify your Supabase policies and try again.
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-red-500">
        Unable to locate your user profile. Please contact support.
      </div>
    );
  }

  const canEdit = profile.is_admin;

  let projectQuery = supabase
    .from('projects')
    .select('id, name, created_by, org_id, created_at')
    .eq('org_id', profile.org_id)
    .eq('id', projectId)
    .maybeSingle<ProjectRecord>();

  if (!canEdit) {
    projectQuery = projectQuery.eq('created_by', user.id);
  }

  const { data: project, error: projectError } = await projectQuery;

  if (projectError) {
    console.error('Error loading project:', projectError);
    return (
      <div className="p-8 text-red-500">
        Error loading project details. Please confirm your row-level security policies.
      </div>
    );
  }

  if (!project) {
    notFound();
  }

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
    .eq('project_id', project.id)
    .eq('org_id', profile.org_id);

  if (!canEdit) {
    photosQuery = photosQuery.eq('created_by', user.id);
  }

  const { data: photos, error: photosError } = await photosQuery.order('created_at', { ascending: false });

  if (photosError) {
    console.error('Error fetching project photos:', photosError);
    return (
      <div className="p-8 text-red-500">
        Error loading photos for this project. Please confirm your row-level security policies.
      </div>
    );
  }

  const rawPhotoRecords = (photos ?? []) as PhotoRecord[];
  const storage = supabase.storage.from('photos');
  const photoRecords = await Promise.all(
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

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              <Link href="/admin" className="text-indigo-600 hover:text-indigo-700">
                ← Back to dashboard
              </Link>
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">{project.name ?? 'Untitled Project'}</h1>
            <p className="mt-2 text-sm text-gray-600">
              Created on {formatDate(project.created_at)} by {project.created_by ?? 'Unknown user'}
            </p>
          </div>
          <LogoutButton />
        </header>

        {photoRecords.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center text-gray-600 shadow-sm">
            {canEdit
              ? 'No photos have been uploaded for this project yet.'
              : 'You have not captured any photos for this project yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {photoRecords.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} canEdit={canEdit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
