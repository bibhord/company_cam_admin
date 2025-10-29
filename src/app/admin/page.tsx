import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PhotoCard } from './photo-card';
import { LogoutButton } from './logout-button';
import type { PhotoRecord, ProjectRecord } from './types';

interface ProfileRecord {
  org_id: string;
  is_admin: boolean;
}

const formatStatus = (status: string) =>
  status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatProjectDate = (value: string | null) => {
  if (!value) {
    return 'Unknown date';
  }
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default async function AdminDashboard() {
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
        Unable to load admin profile information. Please verify your Supabase policies and try again.
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

  let projectsQuery = supabase
    .from('projects')
    .select('id, name, created_by, org_id, created_at')
    .eq('org_id', profile.org_id);

  if (!canEdit) {
    projectsQuery = projectsQuery.eq('created_by', user.id);
  }

  const { data: projects, error: projectsError } = await projectsQuery.order('name', { ascending: true });

  if (projectsError) {
    console.error('Error loading projects:', projectsError);
    return (
      <div className="p-8 text-red-500">
        Error loading projects. Please confirm your row-level security policies.
      </div>
    );
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
    .eq('org_id', profile.org_id);

  if (!canEdit) {
    photosQuery = photosQuery.eq('created_by', user.id);
  }

  const { data: photos, error: photosError } = await photosQuery.order('created_at', { ascending: false });

  if (photosError) {
    console.error('Error fetching photos:', photosError);
    return (
      <div className="p-8 text-red-500">
        Error loading photos. Please confirm your row-level security policies.
      </div>
    );
  }

  const projectRecords = (projects ?? []) as ProjectRecord[];
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
  const statusSummary = photoRecords.reduce<Record<string, number>>((acc, photo) => {
    const statusKey = (photo.upload_status || photo.status || 'unknown').toLowerCase();
    acc[statusKey] = (acc[statusKey] || 0) + 1;
    return acc;
  }, {});
  const photoCountByProject = photoRecords.reduce<Record<string, number>>((acc, photo) => {
    if (!photo.project_id) {
      acc.__unassigned = (acc.__unassigned || 0) + 1;
    } else {
      acc[photo.project_id] = (acc[photo.project_id] || 0) + 1;
    }
    return acc;
  }, {});

  const pageTitle = canEdit ? 'Admin Photo Management' : 'Project Gallery';
  const pageSubtitle = canEdit
    ? 'Review, annotate, and curate all project photos for your organization.'
    : 'Review the projects you own and the photos you have captured.';

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
              <p className="mt-2 text-sm text-gray-600">{pageSubtitle}</p>
            </div>
            <LogoutButton />
          </div>
          {!canEdit ? (
            <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
              Standard user access &mdash; project and photo data limited to your submissions.
            </p>
          ) : null}
        </header>

        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Projects</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-indigo-600">
            <Link className="hover:underline" href="/admin/projects/new">
              + Create new project
            </Link>
            {canEdit ? (
              <Link className="hover:underline" href="/admin/users">
                Manage organization users
              </Link>
            ) : null}
          </div>
          {projectRecords.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">
              {canEdit
                ? 'No projects have been created for this organization yet.'
                : 'You have not created any projects yet.'}
            </p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {projectRecords.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="block rounded-lg border border-gray-200 p-4 transition hover:border-indigo-300 hover:shadow-md"
                  >
                    <h3 className="text-base font-semibold text-gray-900">{project.name ?? 'Untitled Project'}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Created on {formatProjectDate(project.created_at)} by {project.created_by ?? 'Unknown user'}
                    </p>
                    <p className="mt-2 text-sm font-medium text-gray-700">
                      Photos: {photoCountByProject[project.id] ?? 0}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {photoCountByProject.__unassigned && (
            <p className="mt-4 text-sm text-gray-500">
              {photoCountByProject.__unassigned} photo(s) are not currently assigned to a project.
            </p>
          )}
        </section>

        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Upload Status Overview</h2>
          {photoRecords.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">
              {canEdit
                ? 'No photos uploaded yet for this organization.'
                : 'You have not uploaded any photos yet.'}
            </p>
          ) : (
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(statusSummary).map(([status, count]) => (
                <div key={status} className="rounded-lg border border-gray-200 p-4">
                  <dt className="text-sm font-medium text-gray-600">{formatStatus(status)}</dt>
                  <dd className="mt-2 text-2xl font-semibold text-gray-900">{count}</dd>
                </div>
              ))}
              <div className="rounded-lg border border-gray-200 p-4">
                <dt className="text-sm font-medium text-gray-600">Total Photos</dt>
                <dd className="mt-2 text-2xl font-semibold text-gray-900">{photoRecords.length}</dd>
              </div>
            </dl>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Photo Library</h2>
          {photoRecords.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center text-gray-600 shadow-sm">
              {canEdit
                ? 'Once your team begins uploading project photos they will appear here for review.'
                : 'Capture photos in the mobile app to see them here.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {photoRecords.map((photo) => (
                <PhotoCard key={photo.id} photo={photo} canEdit={canEdit} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
