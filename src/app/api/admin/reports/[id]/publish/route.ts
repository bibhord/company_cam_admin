import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { checkFeature } from '@/lib/gate';
import { generateReportPdf } from '@/lib/pdf';

interface ProfileRecord {
  org_id: string;
  role: string;
}

interface PhotoRecord {
  id: string;
  object_key: string;
  name: string | null;
  lat: number | null;
  lon: number | null;
  created_at: string;
}

interface ItemRecord {
  sort_order: number;
  caption: string | null;
  photos: PhotoRecord | PhotoRecord[];
}

interface ReportRecord {
  id: string;
  title: string;
  project_id: string;
  org_id: string;
  created_at: string;
  projects: { name: string | null } | { name: string | null }[] | null;
  organizations: { name: string | null } | { name: string | null }[] | null;
}

/**
 * POST /api/admin/reports/[id]/publish
 * Generates a PDF from current report_items and marks the report as published.
 * Returns a 1-hour signed download URL.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) return NextResponse.json({ error: 'Unable to verify session.' }, { status: 500 });
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const { allowed, effectivePlan } = await checkFeature(supabase, profile.org_id, 'pdf_reports');
  if (!allowed) {
    return NextResponse.json(
      { error: 'PDF reports require a Pro plan.', upgrade: true, currentPlan: effectivePlan },
      { status: 402 }
    );
  }

  // Load report
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('id, title, project_id, org_id, created_at, projects(name), organizations(name)')
    .eq('id', reportId)
    .eq('org_id', profile.org_id)
    .single<ReportRecord>();

  if (reportError || !report) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });

  // Load report items + photos
  const { data: items, error: itemsError } = await supabase
    .from('report_items')
    .select('sort_order, caption, photos(id, object_key, name, lat, lon, created_at)')
    .eq('report_id', reportId)
    .order('sort_order', { ascending: true });

  if (itemsError) return NextResponse.json({ error: 'Failed to load report items.' }, { status: 500 });
  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Add at least one photo before generating.' }, { status: 400 });
  }

  // Resolve photos and generate signed URLs
  const photosWithUrls = await Promise.all(
    (items as ItemRecord[]).map(async (item) => {
      const photo = Array.isArray(item.photos) ? item.photos[0] : item.photos;
      const { data: signed } = await supabase.storage
        .from('photos')
        .createSignedUrl(photo.object_key, 3600);
      return {
        name: photo.name,
        object_key: photo.object_key,
        signedUrl: signed?.signedUrl ?? '',
        caption: item.caption,
        lat: photo.lat,
        lon: photo.lon,
        created_at: photo.created_at,
      };
    })
  );

  const projectName = (Array.isArray(report.projects) ? report.projects[0] : report.projects)?.name ?? 'Project';
  const orgName = (Array.isArray(report.organizations) ? report.organizations[0] : report.organizations)?.name ?? 'Organization';

  // Generate PDF
  const pdfBytes = await generateReportPdf({
    title: report.title,
    projectName,
    orgName,
    createdAt: report.created_at,
    photos: photosWithUrls,
  });

  // Upload with service role (bypasses storage RLS)
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const pdfKey = `${profile.org_id}/reports/${reportId}.pdf`;
  const { error: uploadError } = await svc.storage
    .from('photos')
    .upload(pdfKey, pdfBytes, { contentType: 'application/pdf', upsert: true });

  if (uploadError) {
    console.error('[publish] storage upload failed', uploadError);
    return NextResponse.json({ error: 'Failed to store PDF.' }, { status: 500 });
  }

  // Mark report published
  await supabase
    .from('reports')
    .update({ status: 'published', pdf_object_key: pdfKey, published_at: new Date().toISOString() })
    .eq('id', reportId);

  // Return 1-hour signed download URL
  const { data: download } = await svc.storage
    .from('photos')
    .createSignedUrl(pdfKey, 3600);

  return NextResponse.json({ url: download?.signedUrl });
}
