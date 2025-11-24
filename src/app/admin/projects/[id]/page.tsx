import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { PhotoCard } from '../../photo-card';
import type { PhotoRecord, ProjectRecord } from '../../types';

interface ProfileRecord {
  org_id: string;
  role: 'admin' | 'manager' | 'standard' | 'restricted';
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface LabelAssignmentRow {
  labels?: {
    id: string;
    name: string | null;
    color: string | null;
  } | null;
}

interface ChecklistSummaryRow {
  id: string;
  name: string;
  created_at: string;
  checklist_items?: Array<{
    state: 'todo' | 'doing' | 'done' | 'n/a';
  }>;
}

interface ReportSummaryRow {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  published_at: string | null;
}

interface DocumentRow {
  id: string;
  name: string | null;
  object_key: string;
  created_at: string;
}

interface AlbumRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
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
    .select('org_id, role')
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

  const canEdit = profile.role === 'admin' || profile.role === 'manager';

  let projectQuery = supabase
    .from('projects')
    .select('id, name, created_by, org_id, created_at')
    .eq('org_id', profile.org_id)
    .eq('id', projectId);

  if (!canEdit) {
    projectQuery = projectQuery.eq('created_by', user.id);
  }

  const { data: project, error: projectError } = await projectQuery.maybeSingle<ProjectRecord>();

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
  const { data: labelAssignments, error: labelError } = await supabase
    .from('project_labels')
    .select('labels ( id, name, color )')
    .eq('project_id', project.id);

  if (labelError) {
    console.error('Error loading project labels:', labelError);
  }

  const labels = (labelAssignments ?? [])
    .map((row) => (row as LabelAssignmentRow).labels)
    .filter((label): label is NonNullable<LabelAssignmentRow['labels']> => Boolean(label));

  const { data: checklistRows, error: checklistError } = await supabase
    .from('checklists')
    .select('id, name, created_at, checklist_items ( state )')
    .eq('project_id', project.id)
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  if (checklistError) {
    console.error('Error loading project checklists:', checklistError);
  }

  const checklistSummaries = (checklistRows ?? []).map((row) => {
    const checklist = row as ChecklistSummaryRow;
    const items = checklist.checklist_items ?? [];
    const total = items.length;
    const done = items.filter((item) => item.state === 'done' || item.state === 'n/a').length;
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);
    const isFinished = total > 0 && done === total;
    return {
      id: checklist.id,
      name: checklist.name,
      createdAt: checklist.created_at,
      total,
      done,
      progress,
    isFinished,
  };
});

  const { data: reportRows, error: reportsError } = await supabase
    .from('reports')
    .select('id, title, status, created_at, published_at')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false });

  if (reportsError) {
    console.error('Error loading project reports:', reportsError);
  }

  const reports = (reportRows ?? []) as ReportSummaryRow[];

  const { data: documentRows, error: documentsError } = await supabase
    .from('project_documents')
    .select('id, name, object_key, created_at')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false });

  if (documentsError) {
    console.error('Error loading project documents:', documentsError);
  }

  const documents = (documentRows ?? []) as DocumentRow[];

  const { data: albumRows, error: albumsError } = await supabase
    .from('albums')
    .select('id, name, description, created_at')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false });

  if (albumsError) {
    console.error('Error loading project albums:', albumsError);
  }

  const albums = (albumRows ?? []) as AlbumRow[];

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
      <section className="mx-auto mt-10 max-w-5xl space-y-6">
        <ProjectDetailSection
          title="Labels"
          actionHref={`/admin/projects/${project.id}/labels`}
          actionLabel="Add Labels"
        >
          {labels.length === 0 ? (
            <p className="text-sm text-slate-600">No labels assigned yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700"
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </ProjectDetailSection>

        <ProjectDetailSection
          title="Checklists"
          actionHref={`/admin/projects/${project.id}/checklists/new`}
          actionLabel="Add Checklist"
        >
          {checklistSummaries.length === 0 ? (
            <p className="text-sm text-slate-600">No checklists have been created for this project.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {checklistSummaries.map((checklist) => (
                <li key={checklist.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{checklist.name}</h3>
                      <p className="text-xs text-slate-500">
                        Created {new Date(checklist.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
                        checklist.isFinished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {checklist.isFinished ? 'Finished' : 'In progress'}
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${checklist.progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {checklist.done}/{checklist.total} items complete
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ProjectDetailSection>

        <ProjectDetailSection
          title="Reports"
          actionHref={`/admin/reports/new?projectId=${project.id}`}
          actionLabel="Add Report"
        >
          {reports.length === 0 ? (
            <p className="text-sm text-slate-600">No reports generated yet.</p>
          ) : (
            <ul className="space-y-3 text-sm text-slate-700">
              {reports.map((report) => (
                <li
                  key={report.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{report.title}</p>
                    <p className="text-xs text-slate-500">
                      Created {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href={`/admin/reports/${report.id}`}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ProjectDetailSection>

        <ProjectDetailSection
          title="Project Documents"
          actionHref={`/admin/projects/${project.id}/documents/upload`}
          actionLabel="Add Documents"
        >
          {documents.length === 0 ? (
            <p className="text-sm text-slate-600">No documents uploaded for this project.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-700">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                  <span>{doc.name ?? doc.object_key}</span>
                  <Link
                    href={`/admin/projects/${project.id}/documents/${doc.id}`}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ProjectDetailSection>

        <ProjectDetailSection
          title="Pages"
          actionHref={`/admin/projects/${project.id}/albums/new`}
          actionLabel="Add Pages"
        >
          {albums.length === 0 ? (
            <p className="text-sm text-slate-600">No pages have been created for this project.</p>
          ) : (
            <ul className="space-y-3 text-sm text-slate-700">
              {albums.map((album) => (
                <li key={album.id} className="rounded-md border border-slate-200 px-3 py-2">
                  <p className="font-semibold text-slate-900">{album.name}</p>
                  {album.description ? (
                    <p className="text-xs text-slate-500">{album.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </ProjectDetailSection>
      </section>
    </div>
  );
}

function ProjectDetailSection({
  title,
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  actionLabel: string;
  actionHref: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <Link
          href={actionHref}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          + {actionLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}
