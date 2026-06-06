'use client';

import Link from 'next/link';

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  backHref?: string;
  actionHref?: string;
  actionLabel?: string;
}

export function MobileHeader({ title, showBack = false, backHref = '/m', actionHref, actionLabel }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="relative flex h-12 items-center justify-center px-4">
        {showBack && (
          <Link
            href={backHref}
            className="absolute left-4 flex items-center gap-1 text-sm font-medium text-amber-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back
          </Link>
        )}
        <h1 className="text-sm font-semibold text-slate-900">{title}</h1>
        {actionHref && (
          <Link
            href={actionHref}
            className="absolute right-4 flex items-center justify-center rounded-full bg-amber-500 h-7 w-7 text-white"
            aria-label={actionLabel}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </Link>
        )}
      </div>
    </header>
  );
}
