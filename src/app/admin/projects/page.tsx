import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { PhotoCard } from '../photo-card';
import type { PhotoRecord, ProjectRecord } from '../types';

interface ProfileRecord {
  org_id: string;
  role: string;
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

export default async function ProjectsPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not found in admin projects page');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) {
    console.error('Error loading profile:', profileError);
    return (
      <div className="p-10">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-red-600">Unable to load profile</h1>
          <p className="mt-2 text-sm text-slate-600">
            Please verify row-level security policies and try again.
          </p>
        </div>
      </div>
    );
  }

  const canManageOrg = profile.role === 'admin' || profile.role === 'manager';

  let projectsQuery = supabase
    .from('projects')
    .select('id, name, created_by, org_id, created_at')
    .eq('org_id', profile.org_id);

    console.log(" before can managexxxxxxx");
    console.log(canManageOrg);
    console.log(profile);
  if (!canManageOrg) {
    console.log(" cannot manage");
    projectsQuery = projectsQuery.eq('created_by', user.id);
  }

  const { data: projects, error: projectsError } = await projectsQuery.order('name', { ascending: true });

  if (projectsError) {
    console.error('Error loading projects:', projectsError);
    return (
      <div className="p-10">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-red-600">Unable to load projects</h1>
          <p className="mt-2 text-sm text-slate-600">
            Confirm that your Supabase policies allow reading projects for this organization.
          </p>
        </div>
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

  if (!canManageOrg) {
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
  const managedProjectIds = new Set(projectRecords.map((project) => project.id));
  const latestPhotoRecords = canManageOrg
    ? photoRecords
    : photoRecords.filter((photo) => (photo.project_id ? managedProjectIds.has(photo.project_id) : false));
  const photoCountByProject = photoRecords.reduce<Record<string, number>>((acc, photo) => {
    if (!photo.project_id) {
      acc.__unassigned = (acc.__unassigned || 0) + 1;
    } else {
      acc[photo.project_id] = (acc[photo.project_id] || 0) + 1;
    }
    return acc;
  }, {});

  return (
    <div className="px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track active projects, monitor uploads, and jump into project workspaces.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/projects/new"
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <span className="text-lg">+</span>
            New Project
          </Link>
          {canManageOrg ? (
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 rounded-md border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
            >
              Manage Users
            </Link>
          ) : null}
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Projects in your workspace</h2>
          {projectRecords.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              {canManageOrg
                ? 'No projects have been created for this organization yet.'
                : 'You have not created any projects yet.'}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {projectRecords.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="block rounded-lg border border-slate-200 px-4 py-3 transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{project.name ?? 'Untitled Project'}</h3>
                        <p className="text-xs text-slate-500">
                          Created on {formatProjectDate(project.created_at)} •{' '}
                          {photoCountByProject[project.id] ?? 0} photos
                        </p>
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wide text-indigo-600">Open</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Upload status</h2>
            {photoRecords.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">No photos have been uploaded yet.</p>
            ) : (
              <dl className="mt-3 space-y-3">
                {Object.entries(statusSummary).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                    <dt className="text-sm font-medium text-slate-600">{formatStatus(status)}</dt>
                    <dd className="text-sm font-semibold text-slate-900">{count}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                  <dt className="text-sm font-medium text-slate-600">Total photos</dt>
                  <dd className="text-sm font-semibold text-slate-900">{photoRecords.length}</dd>
                </div>
              </dl>
            )}
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Unassigned photos</h2>
            <p className="mt-2 text-sm text-slate-600">
              Photos captured without a project selection. Assign them to keep your workspace organized.
            </p>
            <p className="mt-4 text-2xl font-semibold text-slate-900">
              {photoCountByProject.__unassigned ?? 0}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Latest uploads</h2>
            {latestPhotoRecords.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Once your team uploads photos they will appear here.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {latestPhotoRecords.slice(0, 6).map((photo) => (
              <PhotoCard key={photo.id} photo={photo} canEdit={canManageOrg} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
