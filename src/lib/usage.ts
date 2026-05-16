import { createClient } from '@supabase/supabase-js';
import { PLAN_LIMITS, type Plan } from './plan-limits';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function checkUploadAllowed(orgId: string): Promise<{
  allowed: boolean;
  reason?: 'trial_expired' | 'photo_limit';
  photoCount: number;
  limit: number | null;
}> {
  const supabase = serviceClient();

  const [orgRes, countRes] = await Promise.all([
    supabase.from('organizations').select('plan, trial_ends_at').eq('id', orgId).single(),
    supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .neq('status', 'deleted'),
  ]);

  const plan = ((orgRes.data?.plan as Plan) ?? 'trial');
  const trialEndsAt = orgRes.data?.trial_ends_at as string | null;
  const photoCount = countRes.count ?? 0;

  if (plan === 'trial' && trialEndsAt && new Date(trialEndsAt) < new Date()) {
    return { allowed: false, reason: 'trial_expired', photoCount, limit: PLAN_LIMITS.trial.photos };
  }

  const limit = PLAN_LIMITS[plan].photos as number | null;
  if (limit !== null && photoCount >= limit) {
    return { allowed: false, reason: 'photo_limit', photoCount, limit };
  }

  return { allowed: true, photoCount, limit };
}

export async function getOrgTrialInfo(orgId: string): Promise<{
  plan: Plan;
  isExpired: boolean;
  daysLeft: number | null;
}> {
  const supabase = serviceClient();
  const { data } = await supabase
    .from('organizations')
    .select('plan, trial_ends_at')
    .eq('id', orgId)
    .single();

  const plan = ((data?.plan as Plan) ?? 'trial');
  const trialEndsAt = data?.trial_ends_at ? new Date(data.trial_ends_at as string) : null;
  const now = new Date();

  const isExpired = plan === 'trial' && trialEndsAt ? trialEndsAt < now : false;
  const daysLeft =
    plan === 'trial' && trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86_400_000))
      : null;

  return { plan, isExpired, daysLeft };
}
