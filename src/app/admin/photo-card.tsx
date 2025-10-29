'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import type { PhotoRecord } from './types';

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    year: 'numeric',
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

  const statusLabel = useMemo(() => formatStatus(photo.upload_status || photo.status || 'unknown'), [
    photo.upload_status,
    photo.status,
  ]);

  const imageSrc = photo.signedUrl ?? photo.url ?? null;

  const projectLabel = useMemo(() => {
    if (!photo.projects) {
      return 'Unassigned Project';
    }

    if (Array.isArray(photo.projects)) {
      return photo.projects[0]?.name ?? 'Unassigned Project';
    }

    return photo.projects.name ?? 'Unassigned Project';
  }, [photo.projects]);
  const tagList = tagsInput
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    if (!canEdit) {
      return;
    }
    event.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/photos/${photo.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags: tagsInput,
          notes: notesInput,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to save photo updates.');
      }

      router.refresh();
    } catch (error) {
      console.error('Error updating photo metadata:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unexpected error updating photo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit) {
      return;
    }
    const shouldDelete = window.confirm('Are you sure you want to permanently delete this photo?');
    if (!shouldDelete) {
      return;
    }

    setErrorMessage(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/photos/${photo.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to delete photo.');
      }

      router.refresh();
    } catch (error) {
      console.error('Error deleting photo:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unexpected error deleting photo.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="relative h-48 w-full bg-gray-100">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={photo.name || 'Project photo'}
            fill
            sizes="(min-width: 1280px) 320px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No preview available
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{photo.name || 'Untitled Photo'}</h3>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-indigo-600">{projectLabel}</p>
          <p className="mt-1 text-sm text-gray-500">Captured on {formatDate(photo.created_at)}</p>
          {photo.created_by ? (
            <p className="mt-1 text-sm text-gray-500">Captured by: {photo.created_by}</p>
          ) : null}
          <p className="mt-1 text-sm text-gray-500">Object Key: {photo.object_key ?? 'Not available'}</p>
        </div>

        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            <span className="h-2 w-2 rounded-full bg-indigo-500" aria-hidden />
            {statusLabel}
          </span>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700">Tags</h4>
          {tagList.length > 0 ? (
            <ul className="mt-1 flex flex-wrap gap-2">
              {tagList.map((tag) => (
                <li key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                  {tag}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-gray-500">No tags have been added yet.</p>
          )}
        </div>

        {canEdit ? (
          <form onSubmit={handleSave} className="mt-auto flex flex-col gap-4">
            <div>
              <label htmlFor={`tags-${photo.id}`} className="block text-sm font-medium text-gray-700">
                Edit Tags (comma separated)
              </label>
              <input
                id={`tags-${photo.id}`}
                type="text"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="roof, before, damage"
              />
            </div>

            <div>
              <label htmlFor={`notes-${photo.id}`} className="block text-sm font-medium text-gray-700">
                Admin Notes
              </label>
              <textarea
                id={`notes-${photo.id}`}
                value={notesInput}
                onChange={(event) => setNotesInput(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                rows={3}
                placeholder="Add context or follow-up instructions for your team"
              />
            </div>

            {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
              >
                {isDeleting ? 'Deleting…' : 'Delete Photo'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-auto rounded-md bg-gray-50 p-4 text-sm text-gray-600">
            Photo details are read-only for standard users.
          </div>
        )}
      </div>
    </article>
  );
}
