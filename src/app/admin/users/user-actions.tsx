'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserActionsProps {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
  hasContent: boolean;
  role: string;
}

export function UserActions({ userId, isActive, isSelf, hasContent, role }: UserActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | 'deactivate' | 'reactivate' | 'delete'>(null);
  const [confirming, setConfirming] = useState<null | 'deactivate' | 'delete'>(null);
  const [error, setError] = useState<string | null>(null);

  if (isSelf) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  async function setActive(action: 'deactivate' | 'reactivate') {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Action failed');
      }
      setConfirming(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  async function hardDelete() {
    setBusy('delete');
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      setConfirming(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(null);
    }
  }

  // Inline confirmation panel
  if (confirming === 'deactivate') {
    return (
      <div className="flex flex-col items-end gap-1">
        <p className="text-xs text-slate-600">Deactivate this user? They will be signed out and lose access.</p>
        <div className="flex gap-2">
          <button
            onClick={() => setActive('deactivate')}
            disabled={busy === 'deactivate'}
            className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
          >
            {busy === 'deactivate' ? 'Working…' : 'Confirm'}
          </button>
          <button
            onClick={() => setConfirming(null)}
            disabled={busy !== null}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (confirming === 'delete') {
    return (
      <div className="flex flex-col items-end gap-1">
        <p className="text-xs text-slate-600">Permanently delete this user? This cannot be undone.</p>
        <div className="flex gap-2">
          <button
            onClick={hardDelete}
            disabled={busy === 'delete'}
            className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
          >
            {busy === 'delete' ? 'Deleting…' : 'Delete'}
          </button>
          <button
            onClick={() => setConfirming(null)}
            disabled={busy !== null}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  // Default state: action buttons
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {isActive ? (
          <button
            onClick={() => setConfirming('deactivate')}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Deactivate
          </button>
        ) : (
          <>
            <button
              onClick={() => setActive('reactivate')}
              disabled={busy === 'reactivate'}
              className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
            >
              {busy === 'reactivate' ? 'Working…' : 'Reactivate'}
            </button>
            {!hasContent && role !== 'admin' && (
              <button
                onClick={() => setConfirming('delete')}
                className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
