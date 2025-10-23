import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PhotoCard } from './photo-card';
import type { PhotoRecord } from './types';

interface ProfileRecord {
  org_id: string;
  is_admin: boolean;
}

const formatStatus = (status: string) =>
  status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

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

  if (!profile || !profile.is_admin) {
    return (
      <div className="p-8 text-red-500">
        You need administrative permissions to access the photo management dashboard.
      </div>
    );
  }

  const { data: photos, error: photosError } = await supabase
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
        projects ( name )
      `
    )
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  if (photosError) {
    console.error('Error fetching photos:', photosError);
    return (
      <div className="p-8 text-red-500">
        Error loading photos. Please confirm your row-level security policies.
      </div>
    );
  }

  const photoRecords = (photos ?? []) as PhotoRecord[];
  const statusSummary = photoRecords.reduce<Record<string, number>>((acc, photo) => {
    const statusKey = (photo.upload_status || photo.status || 'unknown').toLowerCase();
    acc[statusKey] = (acc[statusKey] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Photo Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Review, annotate, and curate all project photos for your organization.
          </p>
        </header>

        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Upload Status Overview</h2>
          {photoRecords.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">No photos uploaded yet for this organization.</p>
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
              Once your team begins uploading project photos they will appear here for review.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {photoRecords.map((photo) => (
                <PhotoCard key={photo.id} photo={photo} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}