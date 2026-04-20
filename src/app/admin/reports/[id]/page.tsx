import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ReportBuilder, type BuilderPhoto } from './report-builder';
import { r2SignedUrl } from '@/lib/r2';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ProfileRecord {
  org_id: string;
  role: string;
}

interface ReportRow {
  id: string;
  title: string;
  status: string;
  project_id: string;
  pdf_object_key: string | null;
}

interface ItemRow {
  photo_id: string;
}

interface PhotoRow {
  id: string;
  object_key: string | null;
  name: string | null;
  created_at: string;
}

interface OrgPlanRow {
  effective_plan: string;
}

export default async function ReportDetailPage({ params }: RouteParams) {
  const { id: reportId } = await params;
  const supabase = createServerComponentClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (!profile) redirect('/login');
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return (
      <div className="px-6 py-10">
        <p className="text-sm text-red-600">You do not have permission to manage reports.</p>
      </div>
    );
  }

  const { data: report } = await supabase
    .from('reports')
    .select('id, title, status, project_id, pdf_object_key')
    .eq('id', reportId)
    .eq('org_id', profile.org_id)
    .maybeSingle<ReportRow>();

  if (!report) notFound();

  // Load photos in the report's project
  const { data: rawPhotos } = await supabase
    .from('photos')
    .select('id, object_key, name, created_at')
    .eq('project_id', report.project_id)
    .eq('org_id', profile.org_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const photoRows = (rawPhotos ?? []) as PhotoRow[];

  // Generate signed URLs for thumbnails
  const projectPhotos: BuilderPhoto[] = await Promise.all(
    photoRows.map(async (photo) => {
      if (!photo.object_key) return { ...photo, signedUrl: null };
      try {
        const signedUrl = await r2SignedUrl(photo.object_key, 216000); // 60 hours
        return { ...photo, signedUrl };
      } catch {
        return { ...photo, signedUrl: null };
      }
    })
  );

  // Load current report_items (which photos are already selected)
  const { data: itemRows } = await supabase
    .from('report_items')
    .select('photo_id')
    .eq('report_id', reportId);

  const initialSelectedIds = ((itemRows ?? []) as ItemRow[]).map((r) => r.photo_id);

  // Check org plan for Pro gate in the UI
  const { data: orgPlan } = await supabase
    .from('_v_org_plan')
    .select('effective_plan')
    .eq('org_id', profile.org_id)
    .single<OrgPlanRow>();

  const isPro = orgPlan?.effective_plan !== 'basic';

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <ReportBuilder
          reportId={reportId}
          reportTitle={report.title}
          status={report.status}
          pdfObjectKey={report.pdf_object_key}
          projectPhotos={projectPhotos}
          initialSelectedIds={initialSelectedIds}
          isPro={isPro}
        />
      </div>
    </div>
  );
}
