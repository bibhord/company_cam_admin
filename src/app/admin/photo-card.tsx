'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import type { PhotoRecord } from './types';

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
  const [tagsInput, setTagsInput] = useState(() => (photo.tags ? photo.tags.join(', ') : ''));
  const [notesInput, setNotesInput] = useState(() => photo.notes ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
        body: JSON.stringify({ tags: tagsInput, notes: notesInput }),
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
          <Image
            src={imageSrc}
            alt={photo.name || 'Project photo'}
            fill
            sizes="(min-width: 1280px) 320px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-slate-600 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            {statusLabel}
          </span>
        </div>
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
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="mt-auto pt-3 text-xs font-medium text-amber-600 hover:text-amber-700 transition text-left cursor-pointer"
          >
            Edit details
          </button>
        ) : null}
      </div>
    </article>
  );
}
