'use client';

import { useState } from 'react';

interface Props {
  projectId: string;
  projectName: string;
}

type State = 'idle' | 'loading' | 'shared' | 'copied' | 'error';

export function ShareProjectButton({ projectId, projectName }: Props) {
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleShare() {
    setState('loading');
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/share`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to create link.');

      const url: string = body.url;
      const title = projectName ? `${projectName} — Job Progress` : 'Project Photos';
      const text = projectName ? `Photos and progress for ${projectName}.` : 'Project photos from CaptureYourWork.';

      // Prefer the native share sheet when available (iOS Safari, Chrome,
      // and Capacitor's WKWebView all expose navigator.share).
      const nav = typeof navigator !== 'undefined' ? navigator : undefined;
      if (nav?.share) {
        try {
          await nav.share({ title, text, url });
          setState('shared');
          setTimeout(() => setState('idle'), 2000);
          return;
        } catch (err) {
          // AbortError = user dismissed; treat as benign no-op.
          if (err instanceof Error && err.name === 'AbortError') {
            setState('idle');
            return;
          }
          // Fall through to clipboard on any other share failure.
        }
      }

      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(url);
        setState('copied');
        setMessage('Link copied');
        setTimeout(() => { setState('idle'); setMessage(null); }, 2500);
        return;
      }

      // Last-resort fallback: show the URL so the user can long-press to copy.
      setMessage(url);
      setState('copied');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Unable to share.');
      setTimeout(() => { setState('idle'); setMessage(null); }, 3000);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleShare}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition active:bg-amber-600 disabled:opacity-60"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
        </svg>
        {state === 'loading' ? 'Loading…' : state === 'copied' ? 'Copied' : state === 'shared' ? 'Shared' : state === 'error' ? 'Error' : 'Share'}
      </button>
      {message && (
        <span className={`max-w-[220px] truncate text-[10px] ${state === 'error' ? 'text-red-600' : 'text-slate-500'}`}>
          {message}
        </span>
      )}
    </div>
  );
}
