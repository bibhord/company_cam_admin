'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MobileHeader } from '../../components/mobile-header';
import { useLocale } from '@/lib/i18n';

export default function NewProjectPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/m/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        const project = await res.json();
        router.push(`/m/projects/${project.id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t('common.errors.generic'));
        setSaving(false);
      }
    } catch {
      setError(t('common.errors.generic'));
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col">
      <MobileHeader title={t('projects.new.title')} showBack backHref="/m/projects" />

      <div className="px-4 pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              {t('projects.new.nameLabel')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('projects.new.namePlaceholder')}
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white shadow-sm transition-colors active:bg-amber-600 disabled:opacity-50"
          >
            {saving ? t('projects.new.creating') : t('projects.new.create')}
          </button>

          <Link
            href="/m/projects"
            className="block w-full rounded-xl border border-slate-200 py-3 text-center text-sm font-medium text-slate-600 active:bg-slate-50"
          >
            {t('common.actions.cancel')}
          </Link>
        </form>
      </div>
    </div>
  );
}
