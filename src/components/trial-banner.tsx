import Link from 'next/link';
import { getOrgTrialInfo } from '@/lib/usage';

export async function TrialBanner({ orgId, upgradeHref }: { orgId: string; upgradeHref: string }) {
  const { plan, isExpired, daysLeft } = await getOrgTrialInfo(orgId);

  if (plan !== 'trial') return null;

  if (isExpired) {
    return (
      <div className="flex items-center justify-between gap-3 bg-red-600 px-4 py-2.5 text-sm text-white">
        <span className="font-medium">Your free trial has expired.</span>
        <Link
          href={upgradeHref}
          className="shrink-0 rounded-md bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
        >
          Upgrade now
        </Link>
      </div>
    );
  }

  if (daysLeft !== null && daysLeft <= 7) {
    return (
      <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2.5 text-sm text-white">
        <span>
          <span className="font-semibold">{daysLeft === 0 ? 'Last day' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}</span>
          {' '}in your free trial.
        </span>
        <Link
          href={upgradeHref}
          className="shrink-0 rounded-md bg-white px-3 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  if (daysLeft !== null) {
    return (
      <div className="flex items-center justify-between gap-3 bg-slate-700 px-4 py-2 text-sm text-slate-200">
        <span>
          Free trial — <span className="font-medium text-white">{daysLeft} days remaining</span>
        </span>
        <Link href={upgradeHref} className="text-xs font-semibold text-amber-400 hover:text-amber-300">
          View plans →
        </Link>
      </div>
    );
  }

  return null;
}
