'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function GoogleCalendarConnect({
  canEdit,
  connectedEmail,
  connectedAt,
}: {
  canEdit: boolean;
  connectedEmail: string | null;
  connectedAt: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [disconnecting, setDisconnecting] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const status = searchParams.get('gcal');
    if (!status) return;
    if (status === 'connected') {
      setBanner({ kind: 'ok', text: 'Google Calendar connected.' });
    } else if (status === 'error') {
      const reason = searchParams.get('reason') ?? 'unknown';
      const friendly = reason === 'no_refresh_token'
        ? 'Google didn\'t return a refresh token. Visit your Google Account → Security → Third-party access, remove CaptureYourWork, then try again.'
        : `Connection failed (${reason}).`;
      setBanner({ kind: 'error', text: friendly });
    }
    // Strip ?gcal= from URL so refresh doesn't re-trigger the banner
    const url = new URL(window.location.href);
    url.searchParams.delete('gcal');
    url.searchParams.delete('reason');
    window.history.replaceState({}, '', url.toString());
  }, [searchParams]);

  async function handleDisconnect() {
    if (!canEdit) return;
    if (!confirm('Disconnect Google Calendar? Your booking slots will no longer hide your personal events.')) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/admin/google-calendar/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error(`${res.status}`);
      router.refresh();
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Disconnect failed' });
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {banner && (
        <div className={`rounded-lg border px-3 py-2 text-xs ${
          banner.kind === 'ok'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {banner.text}
        </div>
      )}

      {connectedEmail ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-slate-900">Connected to {connectedEmail}</p>
            {connectedAt && (
              <p className="text-xs text-slate-500">Since {new Date(connectedAt).toLocaleDateString()}</p>
            )}
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          )}
        </div>
      ) : (
        canEdit ? (
          <a
            href="/api/admin/google-calendar/connect"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1h-9.17v2.92h5.27c-.23 1.5-1.73 4.41-5.27 4.41-3.17 0-5.76-2.63-5.76-5.87s2.59-5.87 5.76-5.87c1.81 0 3.02.77 3.71 1.43l2.53-2.45C16.9 4.06 14.78 3 12.18 3 7.34 3 3.42 6.92 3.42 11.76s3.92 8.76 8.76 8.76c5.06 0 8.41-3.56 8.41-8.56 0-.58-.06-1.02-.14-1.4z" /></svg>
            Connect Google Calendar
          </a>
        ) : (
          <p className="text-xs text-slate-500">Only admins and managers can connect Google Calendar.</p>
        )
      )}
    </div>
  );
}
