import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { PhotoCard } from '../photo-card';
import type { PhotoRecord, ProjectRecord } from '../types';
import { r2SignedUrl } from '@/lib/r2';

interface ProfileRecord {
  org_id: string;
  role: string;
}

const formatProjectDate = (value: string | null) => {
  if (!value) return 'Unknown date';
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
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-700">Unable to load profile</h1>
          <p className="mt-1 text-sm text-red-600">
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

  if (!canManageOrg) {
    projectsQuery = projectsQuery.eq('created_by', user.id);
  }

  const { data: projects, error: projectsError } = await projectsQuery.order('name', { ascending: true });

  if (projectsError) {
    console.error('Error loading projects:', projectsError);
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-700">Unable to load projects</h1>
          <p className="mt-1 text-sm text-red-600">
            Confirm that your Supabase policies allow reading projects for this organization.
          </p>
        </div>
      </div>
    );
  }

  let photosQuery = supabase
    .from('photos')
    .select(`
      id, name, url, created_at, project_id, object_key,
      notes, tags, upload_status, status, created_by,
      projects ( name )
    `)
    .eq('org_id', profile.org_id);

  if (!canManageOrg) {
    photosQuery = photosQuery.eq('created_by', user.id);
  }

  const { data: photos, error: photosError } = await photosQuery.order('created_at', { ascending: false });

  if (photosError) {
    console.error('Error fetching photos:', photosError);
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-700">Unable to load photos</h1>
          <p className="mt-1 text-sm text-red-600">
            Confirm that your Supabase policies allow reading photos for this organization.
          </p>
        </div>
      </div>
    );
  }

  const projectRecords = (projects ?? []) as ProjectRecord[];
  const rawPhotoRecords = (photos ?? []) as PhotoRecord[];
  const photoRecords = await Promise.all(
    rawPhotoRecords.map(async (photo) => {
      if (!photo.object_key) return { ...photo, signedUrl: null };
      try {
        const signedUrl = await r2SignedUrl(photo.object_key, 60 * 60);
        return { ...photo, signedUrl };
      } catch {
        return { ...photo, signedUrl: null };
      }
    })
  );

  const photoCountByProject = photoRecords.reduce<Record<string, number>>((acc, photo) => {
    if (!photo.project_id) {
      acc.__unassigned = (acc.__unassigned || 0) + 1;
    } else {
      acc[photo.project_id] = (acc[photo.project_id] || 0) + 1;
    }
    return acc;
  }, {});

  const managedProjectIds = new Set(projectRecords.map((p) => p.id));
  const latestPhotoRecords = canManageOrg
    ? photoRecords
    : photoRecords.filter((p) => (p.project_id ? managedProjectIds.has(p.project_id) : false));

  const unassignedCount = photoCountByProject.__unassigned ?? 0;

  return (
    <div className="px-6 py-8 lg:px-10">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            {projectRecords.length} project{projectRecords.length !== 1 ? 's' : ''} &middot; {photoRecords.length} photo{photoRecords.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/projects/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Project
          </Link>
          {canManageOrg ? (
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Manage Users
            </Link>
          ) : null}
        </div>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total Projects</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{projectRecords.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total Photos</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{photoRecords.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Unassigned Photos</p>
          <p className={`mt-1 text-2xl font-bold ${unassignedCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {unassignedCount}
          </p>
          {unassignedCount > 0 && (
            <p className="mt-1 text-xs text-slate-400">Photos not linked to any project</p>
          )}
        </div>
      </div>

      {/* Projects list */}
      <section className="mb-10">
        <h2 className="mb-4 text-base font-semibold text-slate-900">All Projects</h2>
        {projectRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
            <p className="mt-3 text-sm font-medium text-slate-600">No projects yet</p>
            <p className="mt-1 text-xs text-slate-400">
              {canManageOrg ? 'Create your first project to start documenting job sites.' : 'No projects have been assigned to you yet.'}
            </p>
            {canManageOrg && (
              <Link href="/admin/projects/new" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600">
                Create Project
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projectRecords.map((project) => {
              const count = photoCountByProject[project.id] ?? 0;
              return (
                <Link
                  key={project.id}
                  href={`/admin/projects/${project.id}`}
                  className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-amber-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-amber-700 transition-colors truncate">
                        {project.name ?? 'Untitled Project'}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Created {formatProjectDate(project.created_at)}
                      </p>
                    </div>
                    <svg className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-amber-500 transition-colors mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                    <span className="text-xs text-slate-500">{count} photo{count !== 1 ? 's' : ''}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Latest uploads */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-slate-900">Latest Uploads</h2>
        {latestPhotoRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
            <p className="mt-3 text-sm font-medium text-slate-600">No photos yet</p>
            <p className="mt-1 text-xs text-slate-400">Once your team uploads photos they will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {latestPhotoRecords.slice(0, 6).map((photo) => (
              <PhotoCard key={photo.id} photo={photo} canEdit={canManageOrg} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
