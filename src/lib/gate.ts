import { SupabaseClient } from '@supabase/supabase-js';

export type EffectivePlan = 'trial' | 'basic' | 'pro';
export type GatedFeature = 'pdf_reports' | 'watermarks' | 'team_members';

const PRO_FEATURES: GatedFeature[] = ['pdf_reports', 'watermarks', 'team_members'];

interface GateResult {
  allowed: boolean;
  effectivePlan: EffectivePlan;
}

export async function checkFeature(
  supabase: SupabaseClient,
  orgId: string,
  feature: GatedFeature
): Promise<GateResult> {
  const { data } = await supabase
    .from('_v_org_plan')
    .select('effective_plan')
    .eq('org_id', orgId)
    .single<{ effective_plan: EffectivePlan }>();

  const effectivePlan: EffectivePlan = data?.effective_plan ?? 'basic';
  const allowed = effectivePlan === 'pro' || effectivePlan === 'trial' || !PRO_FEATURES.includes(feature);

  return { allowed, effectivePlan };
}
