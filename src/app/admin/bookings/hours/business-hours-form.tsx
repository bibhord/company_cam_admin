'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface HoursRow {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

const DAYS = [
  { dow: 0, label: 'Sunday' },
  { dow: 1, label: 'Monday' },
  { dow: 2, label: 'Tuesday' },
  { dow: 3, label: 'Wednesday' },
  { dow: 4, label: 'Thursday' },
  { dow: 5, label: 'Friday' },
  { dow: 6, label: 'Saturday' },
];

function defaultsFor(dow: number): { open_time: string; close_time: string; is_closed: boolean } {
  if (dow === 0) return { open_time: '09:00', close_time: '17:00', is_closed: true };
  return { open_time: '09:00', close_time: '17:00', is_closed: false };
}

export function BusinessHoursForm({
  orgId,
  initial,
  canEdit,
}: {
  orgId: string;
  initial: HoursRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const initialMap = new Map(initial.map((r) => [r.day_of_week, r]));
  const [rows, setRows] = useState<HoursRow[]>(
    DAYS.map((d) => {
      const existing = initialMap.get(d.dow);
      const def = defaultsFor(d.dow);
      return existing
        ? {
            day_of_week: d.dow,
            open_time: existing.open_time.slice(0, 5),
            close_time: existing.close_time.slice(0, 5),
            is_closed: existing.is_closed,
          }
        : { day_of_week: d.dow, ...def };
    }),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateRow(dow: number, patch: Partial<HoursRow>) {
    setRows((prev) => prev.map((r) => (r.day_of_week === dow ? { ...r, ...patch } : r)));
    setSaved(false);
  }

  async function handleSave() {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      // Validate
      for (const r of rows) {
        if (r.is_closed) continue;
        if (r.open_time >= r.close_time) {
          throw new Error(`${DAYS.find((d) => d.dow === r.day_of_week)?.label}: open time must be before close time.`);
        }
      }
      const payload = rows.map((r) => ({
        day_of_week: r.day_of_week,
        open_time: r.open_time + ':00',
        close_time: r.close_time + ':00',
        is_closed: r.is_closed,
      }));
      const res = await fetch('/api/admin/business-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Save failed');
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const day = DAYS.find((d) => d.dow === r.day_of_week)!;
        return (
          <div key={r.day_of_week} className="flex items-center gap-3">
            <div className="w-24 text-sm font-medium text-slate-700">{day.label}</div>
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={!r.is_closed}
                onChange={(e) => updateRow(r.day_of_week, { is_closed: !e.target.checked })}
                disabled={!canEdit}
                className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              Open
            </label>
            <input
              type="time"
              value={r.open_time}
              onChange={(e) => updateRow(r.day_of_week, { open_time: e.target.value })}
              disabled={!canEdit || r.is_closed}
              className="rounded border border-slate-200 px-2 py-1 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
            />
            <span className="text-sm text-slate-400">to</span>
            <input
              type="time"
              value={r.close_time}
              onChange={(e) => updateRow(r.day_of_week, { close_time: e.target.value })}
              disabled={!canEdit || r.is_closed}
              className="rounded border border-slate-200 px-2 py-1 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
        );
      })}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">Saved.</p>}

      {canEdit && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Hours'}
          </button>
        </div>
      )}

      {!canEdit && (
        <p className="text-xs text-slate-500">Only admins and managers can change business hours.</p>
      )}
      <p className="text-xs text-slate-400">Org: {orgId.slice(0, 8)}…</p>
    </div>
  );
}
