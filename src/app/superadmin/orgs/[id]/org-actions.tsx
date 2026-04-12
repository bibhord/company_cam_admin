'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type OrgStatus = 'pending' | 'active' | 'suspended';
type OrgPlan = 'trial' | 'basic' | 'pro';

interface OrgActionsProps {
  orgId: string;
  currentStatus: string;
  currentPlan: string;
}

export function OrgActions({ orgId, currentStatus, currentPlan }: OrgActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(payload: { status?: OrgStatus; plan?: OrgPlan }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/orgs/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Update failed.');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {currentStatus === 'pending' && (
          <button
            onClick={() => update({ status: 'active' })}
            disabled={busy}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Approve
          </button>
        )}
        {currentStatus === 'active' && (
          <button
            onClick={() => { if (confirm('Suspend this org? Their users will lose access.')) update({ status: 'suspended' }); }}
            disabled={busy}
            className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
          >
            Suspend
          </button>
        )}
        {currentStatus === 'suspended' && (
          <button
            onClick={() => update({ status: 'active' })}
            disabled={busy}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Reinstate
          </button>
        )}
      </div>

      {/* Plan selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Plan:</span>
        {(['trial', 'basic', 'pro'] as OrgPlan[]).map((plan) => (
          <button
            key={plan}
            onClick={() => update({ plan })}
            disabled={busy || currentPlan === plan}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              currentPlan === plan
                ? 'bg-indigo-600 text-white cursor-default'
                : 'border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200 disabled:opacity-50'
            }`}
          >
            {plan}
          </button>
        ))}
      </div>
    </div>
  );
}
