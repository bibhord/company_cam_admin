import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { checkFeature } from '@/lib/gate';
import { generateReportPdf } from '@/lib/pdf';
import { r2SignedUrl, r2Upload } from '@/lib/r2';

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
  created_by: string | null;
}

const HASH_VERSION = 1;

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
    .select('sort_order, caption, photos(id, object_key, name, lat, lon, created_at, created_by)')
    .eq('report_id', reportId)
    .order('sort_order', { ascending: true });

  if (itemsError) return NextResponse.json({ error: 'Failed to load report items.' }, { status: 500 });
  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Add at least one photo before generating.' }, { status: 400 });
  }

  // Build photographer lookup once across all unique created_by ids.
  const rawPhotos = (items as ItemRecord[]).map((item) =>
    Array.isArray(item.photos) ? item.photos[0] : item.photos,
  );
  const photographerIds = Array.from(new Set(rawPhotos.map((p) => p.created_by).filter(Boolean) as string[]));
  const photographerById = new Map<string, string>();
  if (photographerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', photographerIds);
    for (const p of profiles ?? []) {
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || 'Unknown';
      photographerById.set(p.user_id, name);
    }
  }

  // Resolve photos and generate signed URLs + provenance hashes.
  const photosWithUrls = await Promise.all(
    (items as ItemRecord[]).map(async (item) => {
      const photo = Array.isArray(item.photos) ? item.photos[0] : item.photos;
      let signedUrl = '';
      try {
        signedUrl = await r2SignedUrl(photo.object_key, 3600);
      } catch (err) {
        console.error('[publish] signed URL generation failed', err);
      }
      const photographer = (photo.created_by && photographerById.get(photo.created_by)) || 'Unknown';
      const provenance = [
        `v${HASH_VERSION}`,
        photo.id,
        photo.object_key,
        photo.created_at,
        photo.lat ?? '',
        photo.lon ?? '',
        photo.created_by ?? '',
      ].join('|');
      const verifyHash = await sha256Hex(provenance);
      return {
        id: photo.id,
        name: photo.name,
        object_key: photo.object_key,
        signedUrl,
        caption: item.caption,
        lat: photo.lat,
        lon: photo.lon,
        created_at: photo.created_at,
        photographer,
        verifyHash,
      };
    })
  );

  const verifyFingerprint = await sha256Hex(`v${HASH_VERSION}|${photosWithUrls.map((p) => p.verifyHash).join('|')}`);

  const projectName = (Array.isArray(report.projects) ? report.projects[0] : report.projects)?.name ?? 'Project';
  const orgName = (Array.isArray(report.organizations) ? report.organizations[0] : report.organizations)?.name ?? 'Organization';

  // Generate PDF
  const pdfBytes = await generateReportPdf({
    title: report.title,
    projectName,
    orgName,
    createdAt: report.created_at,
    photos: photosWithUrls,
    verifyFingerprint,
    verifyVersion: HASH_VERSION,
  });

  const pdfKey = `${profile.org_id}/reports/${reportId}.pdf`;
  try {
    await r2Upload(pdfKey, Buffer.from(pdfBytes), 'application/pdf');
  } catch (uploadError) {
    console.error('[publish] R2 upload failed', uploadError);
    return NextResponse.json({ error: 'Failed to store PDF.' }, { status: 500 });
  }

  // Mark report published
  await supabase
    .from('reports')
    .update({ status: 'published', pdf_object_key: pdfKey, published_at: new Date().toISOString() })
    .eq('id', reportId);

  // Return 1-hour signed download URL
  const url = await r2SignedUrl(pdfKey, 3600);

  return NextResponse.json({ url });
}
