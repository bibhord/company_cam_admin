'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface BuilderPhoto {
  id: string;
  name: string | null;
  signedUrl: string | null;
  created_at: string;
}

interface ReportBuilderProps {
  reportId: string;
  reportTitle: string;
  status: string;
  pdfObjectKey: string | null;
  projectPhotos: BuilderPhoto[];
  initialSelectedIds: string[];
  isPro: boolean;
}

export function ReportBuilder({
  reportId,
  reportTitle,
  status,
  pdfObjectKey,
  projectPhotos,
  initialSelectedIds,
  isPro,
}: ReportBuilderProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelectedIds));
  const [generating, setGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function togglePhoto(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setDownloadUrl(null);

    try {
      // 1. Persist current selection
      const itemsRes = await fetch(`/api/admin/reports/${reportId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: Array.from(selected) }),
      });
      if (!itemsRes.ok) {
        const body = await itemsRes.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to save photo selection.');
      }

      // 2. Generate PDF
      const pubRes = await fetch(`/api/admin/reports/${reportId}/publish`, {
        method: 'POST',
      });
      const pubBody = await pubRes.json().catch(() => null);

      if (pubRes.status === 402) {
        throw new Error('PDF reports require a Pro plan. Upgrade under Payments.');
      }
      if (!pubRes.ok) {
        throw new Error(pubBody?.error ?? 'Failed to generate PDF.');
      }

      setDownloadUrl(pubBody.url);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setGenerating(false);
    }
  }

  const isPublished = status === 'published';
  const selectedCount = selected.size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{reportTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Select photos to include, then generate the PDF.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isPro && (
            <a
              href="/admin/payments?ref=report_builder"
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
            >
              Upgrade to Pro
            </a>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || selectedCount === 0 || !isPro}
            title={!isPro ? 'Requires Pro plan' : undefined}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {generating
              ? 'Generating…'
              : isPublished
              ? `Re-generate PDF (${selectedCount})`
              : `Generate PDF (${selectedCount})`}
          </button>
        </div>
      </div>

      {/* Status banner */}
      {(downloadUrl || (isPublished && pdfObjectKey)) && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <svg className="h-5 w-5 flex-shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="flex-1 text-sm font-medium text-emerald-800">PDF ready</p>
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
            >
              Download
            </a>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {/* Photo grid */}
      {projectPhotos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-500">
          No photos in this project yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {projectPhotos.map((photo) => {
            const isSelected = selected.has(photo.id);
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => togglePhoto(photo.id)}
                className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-300'
                    : 'border-transparent hover:border-slate-300'
                }`}
              >
                {photo.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.signedUrl}
                    alt={photo.name ?? 'Photo'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
                    No preview
                  </div>
                )}

                {/* Selection overlay */}
                <div
                  className={`absolute inset-0 transition ${
                    isSelected ? 'bg-indigo-600/20' : 'bg-transparent group-hover:bg-black/5'
                  }`}
                />

                {/* Checkmark */}
                {isSelected && (
                  <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 shadow">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400">
        {selectedCount} of {projectPhotos.length} photo{projectPhotos.length !== 1 ? 's' : ''} selected
      </p>
    </div>
  );
}
