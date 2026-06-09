'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n';

type ProjectStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed';

const STATUSES: { value: ProjectStatus; activeClass: string }[] = [
  { value: 'not_started', activeClass: 'bg-slate-600 text-white border-slate-600' },
  { value: 'in_progress', activeClass: 'bg-blue-600 text-white border-blue-600' },
  { value: 'blocked', activeClass: 'bg-red-600 text-white border-red-600' },
  { value: 'completed', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
];

const LABEL_KEYS: Record<ProjectStatus, string> = {
  not_started: 'projects.status.notStarted',
  in_progress: 'projects.status.inProgress',
  blocked: 'projects.status.blocked',
  completed: 'projects.status.completed',
};

export function ProjectStatusPicker({
  projectId,
  initialStatus,
}: {
  projectId: string;
  initialStatus: ProjectStatus | null;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<ProjectStatus>(initialStatus ?? 'not_started');
  const [saving, setSaving] = useState<ProjectStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(next: ProjectStatus) {
    if (next === status || saving) return;
    setSaving(next);
    setError(null);
    try {
      const res = await fetch(`/api/m/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update status');
      }
      setStatus(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const isActive = status === s.value;
          const isSaving = saving === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => handleClick(s.value)}
              disabled={saving !== null}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-60 ${
                isActive
                  ? s.activeClass
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isSaving && (
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {t(LABEL_KEYS[s.value])}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
