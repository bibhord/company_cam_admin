'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CompanySettingsForm({
  initialName,
  initialSlug,
  canEdit,
}: {
  initialName: string;
  initialSlug: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const nameChanged = name.trim() !== initialName;
  const slugChanged = slug.trim().toLowerCase() !== initialSlug;
  const dirty = nameChanged || slugChanged;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit || !dirty) return;

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const body: Record<string, string> = {};
      if (nameChanged) body.name = name.trim();
      if (slugChanged) body.portfolio_slug = slug.trim().toLowerCase();

      const res = await fetch('/api/admin/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Update failed');
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="org-name" className="block text-sm font-semibold text-slate-700">
          Company name
        </label>
        <p className="mt-0.5 text-xs text-slate-500">
          Shown on your public portfolio header and invoices.
        </p>
        <input
          id="org-name"
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setSaved(false); }}
          disabled={!canEdit || saving}
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-slate-50"
          maxLength={200}
        />
      </div>

      <div>
        <label htmlFor="org-slug" className="block text-sm font-semibold text-slate-700">
          Portfolio subdomain
        </label>
        <p className="mt-0.5 text-xs text-slate-500">
          Your public site will live at <span className="font-mono">{slug || 'your-name'}.captureyourwork.com</span>.
          Lowercase letters, numbers, and hyphens only.
        </p>
        <div className="mt-2 flex items-center gap-0 rounded-lg border border-slate-200 bg-white focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500">
          <input
            id="org-slug"
            type="text"
            value={slug}
            onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSaved(false); }}
            disabled={!canEdit || saving}
            className="flex-1 rounded-l-lg bg-transparent px-3 py-2 text-sm text-slate-900 focus:outline-none disabled:bg-slate-50"
            maxLength={40}
            placeholder="your-company"
          />
          <span className="rounded-r-lg bg-slate-50 px-3 py-2 text-sm text-slate-500 border-l border-slate-200">
            .captureyourwork.com
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">Saved.</p>}

      {canEdit && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !dirty || name.trim().length === 0 || slug.trim().length === 0}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </form>
  );
}
