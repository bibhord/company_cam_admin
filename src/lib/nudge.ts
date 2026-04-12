import { createClient } from '@supabase/supabase-js';

const THRESHOLDS = [10, 25, 50, 100];

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function fireReportNudge(
  projectId: string,
  orgId: string,
  uploaderId: string
): Promise<void> {
  const svc = makeServiceClient();

  // Count active photos in this project
  const { count } = await svc
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'active');

  if (!count || !THRESHOLDS.includes(count)) return;

  // Get project info
  const { data: project } = await svc
    .from('projects')
    .select('name, created_by')
    .eq('id', projectId)
    .single<{ name: string; created_by: string }>();

  if (!project) return;

  // Resolve org plan for paywall-aware CTA
  const { data: orgPlan } = await svc
    .from('_v_org_plan')
    .select('effective_plan')
    .eq('org_id', orgId)
    .single<{ effective_plan: string }>();

  const isPro = orgPlan?.effective_plan !== 'basic';

  // Notify the project owner (fall back to uploader if created_by missing)
  const notifyUserId = project.created_by ?? uploaderId;

  await svc.from('notifications').insert({
    user_id: notifyUserId,
    org_id: orgId,
    event: 'report_nudge',
    title: `${project.name} has ${count} photos`,
    body: isPro
      ? 'Generate a summary report to send to your client now.'
      : 'Upgrade to Pro to generate a PDF report for your client.',
    action_url: isPro
      ? `/admin/reports/new?projectId=${projectId}`
      : `/admin/payments?ref=nudge`,
  });
}
