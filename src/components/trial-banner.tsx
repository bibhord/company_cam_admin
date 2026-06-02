// Trial banner is hidden while we collect user input on pricing.
// Restore by reverting this commit; the rest of the trial/usage code
// (getOrgTrialInfo, plan gating) is intact and ready to go.

export async function TrialBanner({ orgId, upgradeHref }: { orgId: string; upgradeHref: string }) {
  void orgId;
  void upgradeHref;
  return null;
}
