'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface ProjectRow {
  id: string;
  name: string;
  status: string | null;
  featured: boolean;
  created_at: string;
  photo_count: number;
}

interface Props {
  orgName: string;
  slug: string | null;
  published: boolean;
  suggestedSlug: string;
  projects: ProjectRow[];
  completedFeaturedCount: number;
}

const ROOT = 'captureyourwork.com';

export function PortfolioManager({ orgName, slug, published, suggestedSlug, projects, completedFeaturedCount }: Props) {
  const router = useRouter();
  const [slugInput, setSlugInput] = useState(slug ?? suggestedSlug);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const eligible = completedFeaturedCount >= 2;

  async function call(body: Record<string, unknown>) {
    setError(null);
    setInfo(null);
    const res = await fetch('/api/admin/portfolio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? `Request failed (${res.status}).`);
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  async function toggleFeatured(projectId: string, current: boolean) {
    setError(null);
    const res = await fetch(`/api/admin/projects/${projectId}/feature`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured: !current }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Failed to update project.');
      return;
    }
    startTransition(() => router.refresh());
  }

  async function saveSlug() {
    if (await call({ slug: slugInput })) {
      setInfo('Slug saved.');
    }
  }

  async function publish() {
    if (await call({ action: 'publish', slug: slugInput })) {
      setInfo('Published! It may take 1–2 minutes for DNS to propagate.');
    }
  }

  async function unpublish() {
    if (await call({ action: 'unpublish' })) {
      setInfo('Unpublished.');
    }
  }

  const url = slug ? `https://${slug}.${ROOT}` : null;

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {published ? 'Published' : 'Not published'}
            </p>
            {published && url && (
              <a href={url} target="_blank" rel="noopener" className="mt-2 inline-block text-sm font-medium text-amber-600 hover:underline">
                {url} ↗
              </a>
            )}
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
            published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {published ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>
      </div>

      {/* Slug card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-bold text-slate-900">Site URL</h2>
        <p className="mt-1 text-sm text-slate-500">
          Pick the subdomain where your portfolio will be served.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <input
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            placeholder="your-company"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <span className="text-sm text-slate-500">.{ROOT}</span>
          <button
            onClick={saveSlug}
            disabled={pending || !slugInput || slugInput === slug}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>

      {/* Featured projects card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Featured Projects</h2>
            <p className="mt-1 text-sm text-slate-500">
              Toggle which completed projects appear on your portfolio.
            </p>
          </div>
          <p className={`text-xs font-semibold ${eligible ? 'text-emerald-600' : 'text-amber-600'}`}>
            {completedFeaturedCount} / 2 featured + completed
          </p>
        </div>

        <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {projects.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              You don&apos;t have any projects yet.
            </p>
          ) : (
            projects.map((p) => {
              const completed = p.status === 'completed';
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.photo_count} photos · {p.status ?? 'no status'}
                      {!completed && <span className="ml-2 text-amber-600">(must be completed to appear)</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFeatured(p.id, p.featured)}
                    disabled={pending}
                    className={`text-xs font-semibold ${
                      p.featured
                        ? 'text-amber-600 hover:text-amber-700'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {p.featured ? '★ Featured' : '☆ Feature'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Publish / Unpublish */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">{published ? 'Take site offline' : 'Publish site'}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {published
                ? 'Make your portfolio unavailable to the public.'
                : `Make ${orgName}'s portfolio publicly accessible. Need 2+ featured & completed projects.`}
            </p>
          </div>
          {published ? (
            <button
              onClick={unpublish}
              disabled={pending}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={publish}
              disabled={pending || !eligible || !slugInput}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {pending ? 'Publishing…' : 'Publish'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      {info && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{info}</div>
      )}
    </div>
  );
}
