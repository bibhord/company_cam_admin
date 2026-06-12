'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import type { PhotoRecord } from './types';
import { AnnotationModal } from '@/components/annotations/annotation-modal';
import { AnnotationOverlay } from '@/components/annotations/annotation-overlay';
import { EMPTY_DOC, type AnnotationDoc } from '@/lib/annotations';

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatStatus = (status: string) =>
  status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

interface PhotoCardProps {
  photo: PhotoRecord;
  canEdit: boolean;
}

export function PhotoCard({ photo, canEdit }: PhotoCardProps) {
  const router = useRouter();
  const [tagsInput, setTagsInput] = useState(() => {
    if (Array.isArray(photo.tags)) return photo.tags.join(', ');
    if (typeof photo.tags === 'string') {
      try {
        const parsed = JSON.parse(photo.tags);
        if (Array.isArray(parsed)) return parsed.join(', ');
      } catch {}
      return photo.tags;
    }
    return '';
  });
  const [notesInput, setNotesInput] = useState(() => photo.notes ?? '');
  const [bucketInput, setBucketInput] = useState<'before' | 'after' | ''>(() => photo.bucket ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [annotationOpen, setAnnotationOpen] = useState(false);
  const [annotationDoc, setAnnotationDoc] = useState<AnnotationDoc>(() => {
    const raw = photo.photo_annotations;
    const candidate = Array.isArray(raw) ? raw[0]?.data : raw?.data;
    return candidate && typeof candidate === 'object' ? (candidate as AnnotationDoc) : EMPTY_DOC;
  });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  // Refresh annotations when the editor closes (after a save / delete).
  useEffect(() => {
    if (annotationOpen) return;
    let cancelled = false;
    fetch(`/api/admin/photos/${photo.id}/annotations`)
      .then((r) => r.json())
      .then((res) => { if (!cancelled && res?.data) setAnnotationDoc(res.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [photo.id, annotationOpen]);

  const hasAnnotations = annotationDoc.shapes.length > 0;

  const statusLabel = useMemo(() => formatStatus(photo.upload_status || photo.status || 'unknown'), [
    photo.upload_status,
    photo.status,
  ]);

  const imageSrc = photo.signedUrl ?? photo.url ?? null;

  const projectLabel = useMemo(() => {
    if (!photo.projects) return 'Unassigned';
    if (Array.isArray(photo.projects)) return photo.projects[0]?.name ?? 'Unassigned';
    return photo.projects.name ?? 'Unassigned';
  }, [photo.projects]);

  const tagList = tagsInput
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    if (!canEdit) return;
    event.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/photos/${photo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: tagsInput, notes: notesInput, bucket: bucketInput === '' ? null : bucketInput }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to save photo updates.');
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unexpected error updating photo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit) return;
    const shouldDelete = window.confirm('Are you sure you want to permanently delete this photo?');
    if (!shouldDelete) return;

    setErrorMessage(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/photos/${photo.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to delete photo.');
      }
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unexpected error deleting photo.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-sm">
      {/* Image */}
      <div className="relative h-44 w-full bg-slate-100">
        {imageSrc ? (
          <>
            <Image
              src={imageSrc}
              alt={photo.name || 'Project photo'}
              fill
              sizes="(min-width: 1280px) 320px, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
              onLoadingComplete={(el) => setNatural({ w: el.naturalWidth, h: el.naturalHeight })}
            />
            {natural && annotationDoc.shapes.length > 0 && (
              <AnnotationOverlay doc={annotationDoc} naturalWidth={natural.w} naturalHeight={natural.h} />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {photo.bucket && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold backdrop-blur-sm ${
              photo.bucket === 'before' ? 'bg-blue-600/90 text-white' : 'bg-emerald-600/90 text-white'
            }`}>
              {photo.bucket === 'before' ? 'Before' : 'After'}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-slate-600 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            {statusLabel}
          </span>
        </div>
        {hasAnnotations && (
          <div className="absolute top-2 left-2">
            <span
              aria-label="Has annotations"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
              </svg>
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold text-slate-900 truncate">{photo.name || 'Untitled Photo'}</h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <span>{projectLabel}</span>
          <span className="text-slate-300">&middot;</span>
          <span>{formatDate(photo.created_at)}</span>
        </div>

        {/* Tags */}
        {tagList.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {tagList.map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Edit form */}
        {canEdit && isEditing ? (
          <form onSubmit={handleSave} className="mt-3 flex flex-col gap-3">
            <div>
              <label htmlFor={`tags-${photo.id}`} className="block text-xs font-medium text-slate-600 mb-1">
                Tags (comma separated)
              </label>
              <input
                id={`tags-${photo.id}`}
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                placeholder="roof, before, damage"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Category
              </label>
              <div className="flex gap-1">
                {([
                  { v: '', label: 'Unset' },
                  { v: 'before', label: 'Before' },
                  { v: 'after', label: 'After' },
                ] as const).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setBucketInput(opt.v)}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                      bucketInput === opt.v
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor={`notes-${photo.id}`} className="block text-xs font-medium text-slate-600 mb-1">
                Notes
              </label>
              <textarea
                id={`notes-${photo.id}`}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                rows={2}
                placeholder="Add context for your team"
              />
            </div>

            {errorMessage && (
              <p className="text-xs text-red-500">{errorMessage}</p>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </form>
        ) : canEdit ? (
          <div className="mt-auto flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 transition cursor-pointer"
            >
              Edit details
            </button>
            {imageSrc && (
              <button
                type="button"
                onClick={() => setAnnotationOpen(true)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 transition cursor-pointer"
              >
                Annotate
              </button>
            )}
          </div>
        ) : null}
      </div>

      {canEdit && imageSrc && (
        <AnnotationModal
          photoId={photo.id}
          imageUrl={imageSrc}
          open={annotationOpen}
          onClose={() => setAnnotationOpen(false)}
        />
      )}
    </article>
  );
}
