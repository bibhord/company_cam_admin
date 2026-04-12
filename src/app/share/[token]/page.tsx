import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

interface RouteParams {
  params: Promise<{ token: string }>;
}

interface ShareRecord {
  project_id: string;
  expires_at: string | null;
  projects: {
    name: string | null;
    organizations: { name: string | null } | null;
  } | null;
}

interface PhotoRecord {
  id: string;
  object_key: string;
  name: string | null;
  created_at: string;
  lat: number | null;
  lon: number | null;
}

export default async function GuestProjectView({ params }: RouteParams) {
  const { token } = await params;

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Resolve the share token
  const { data: share } = await svc
    .from('project_shares')
    .select('project_id, expires_at, projects(name, organizations(name))')
    .eq('token', token)
    .maybeSingle<ShareRecord>();

  if (!share) notFound();
  if (share.expires_at && new Date(share.expires_at) < new Date()) notFound();

  // Fetch photos for this project
  const { data: rawPhotos } = await svc
    .from('photos')
    .select('id, object_key, name, created_at, lat, lon')
    .eq('project_id', share.project_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(200);

  const photos = rawPhotos as PhotoRecord[] ?? [];

  // Generate signed URLs (1 hour)
  const photosWithUrls = await Promise.all(
    photos.map(async (photo) => {
      const { data } = await svc.storage
        .from('photos')
        .createSignedUrl(photo.object_key, 3600);
      return { ...photo, signedUrl: data?.signedUrl ?? null };
    })
  );

  const projectName = share.projects?.name ?? 'Project';
  const orgName = share.projects?.organizations?.name;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Viral signup banner */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-indigo-600 px-4 py-2.5 shadow-md">
        <span className="text-sm text-white">
          Want to organize your own jobs like this?
        </span>
        <a
          href="/signup?ref=guest_share"
          className="ml-4 flex-shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
        >
          Try CaptureYourWork free
        </a>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            {orgName && <span>{orgName}</span>}
            {orgName && <span>/</span>}
            <span>Shared project</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{projectName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {photosWithUrls.length} photo{photosWithUrls.length !== 1 ? 's' : ''} · Read-only view
          </p>
        </div>

        {/* Photo grid */}
        {photosWithUrls.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-20 text-center text-sm text-slate-500">
            No photos in this project.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {photosWithUrls.map((photo) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                {photo.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.signedUrl}
                    alt={photo.name ?? 'Photo'}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                    Unavailable
                  </div>
                )}

                {/* Hover overlay with metadata */}
                <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/70 to-transparent p-2 transition-transform group-hover:translate-y-0">
                  <p className="truncate text-xs font-medium text-white">{photo.name ?? 'Untitled'}</p>
                  {photo.lat != null && photo.lon != null && (
                    <p className="text-xs text-slate-300">
                      {Number(photo.lat).toFixed(4)}, {Number(photo.lon).toFixed(4)}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    {new Date(photo.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-12 rounded-2xl border border-indigo-100 bg-indigo-50 px-6 py-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Organize your own jobs like this</h2>
          <p className="mt-2 text-sm text-slate-600">
            CaptureYourWork helps contractors capture, organize, and share job-site photos in real time.
          </p>
          <a
            href="/signup?ref=guest_share_footer"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Start free — no credit card needed
          </a>
        </div>
      </div>
    </div>
  );
}
