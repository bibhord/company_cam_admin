'use client';

import { useEffect, useState } from 'react';

export function CalendarFeed({ token }: { token: string }) {
  const [origin, setOrigin] = useState('https://app.captureyourwork.com');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const url = `${origin}/api/ical/${token}`;
  const webcalUrl = url.replace(/^https?:/, 'webcal:');
  const googleAddUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={url}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none"
        />
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={googleAddUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Add to Google Calendar
        </a>
        <a
          href={webcalUrl}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Add to Apple Calendar
        </a>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-medium text-slate-500">Outlook / other apps</summary>
        <p className="mt-2 text-xs text-slate-500">
          In Outlook: Calendar → Add calendar → Subscribe from web → paste the URL above. Most other calendar apps have a similar &quot;subscribe from URL&quot; option.
        </p>
      </details>
    </div>
  );
}
