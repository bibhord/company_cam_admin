'use client';

import Link from 'next/link';

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  backHref?: string;
}

export function MobileHeader({ title, showBack = false, backHref = '/m' }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)]">
      <div className="relative flex h-12 items-center justify-center px-4">
        {showBack && (
          <Link
            href={backHref}
            className="absolute left-4 flex items-center gap-1 text-sm font-medium text-amber-500"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
            Back
          </Link>
        )}
        <h1 className="text-sm font-semibold text-slate-900">{title}</h1>
      </div>
    </header>
  );
}
