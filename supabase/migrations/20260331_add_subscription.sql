-- Add subscription fields to organizations
ALTER TABLE organizations
  ADD COLUMN plan text NOT NULL DEFAULT 'trial'
    CONSTRAINT organizations_plan_check CHECK (plan IN ('trial', 'basic', 'pro')),
  ADD COLUMN trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  ADD COLUMN stripe_subscription_id text;

-- Computed view: resolves effective plan (trial expires → basic)
CREATE OR REPLACE VIEW _v_org_plan AS
SELECT
  o.id                                                         AS org_id,
  o.plan,
  o.trial_ends_at,
  CASE
    WHEN o.plan = 'trial' AND now() < o.trial_ends_at  THEN 'trial'
    WHEN o.plan = 'trial' AND now() >= o.trial_ends_at THEN 'basic'
    ELSE o.plan
  END                                                          AS effective_plan
FROM organizations o;
