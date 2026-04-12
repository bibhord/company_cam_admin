'use client';

import { useState } from 'react';

interface ImpersonateButtonProps {
  userId: string;
  userName: string;
}

export function ImpersonateButton({ userId, userName }: ImpersonateButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setState('loading');
    try {
      const res = await fetch('/api/superadmin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to generate link.');
      setLink(body.link);
      setState('ready');
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (state === 'idle' || state === 'loading' || state === 'error') {
    return (
      <button
        onClick={handleGenerate}
        disabled={state === 'loading'}
        className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
      >
        {state === 'loading' ? 'Generating…' : state === 'error' ? 'Error — retry' : 'Impersonate'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 max-w-[160px] truncate" title={link ?? ''}>
        Link ready
      </span>
      <button
        onClick={handleCopy}
        className="text-xs font-semibold text-amber-400 hover:text-amber-300"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <a
        href={link ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-indigo-400 hover:text-indigo-300"
      >
        Open
      </a>
      <button
        onClick={() => { setLink(null); setState('idle'); }}
        className="text-xs text-slate-600 hover:text-slate-400"
      >
        ✕
      </button>
      <p className="hidden">{userName}</p>
    </div>
  );
}
