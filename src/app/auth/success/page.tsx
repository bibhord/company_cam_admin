'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthSuccessPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function handleRedirect() {
      // Wait briefly for cookies/localStorage to settle
      await new Promise((r) => setTimeout(r, 500));

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Try refreshing the session from storage
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        if (!refreshed) {
          setChecking(false);
          return;
        }
      }

      // Detect context and redirect
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      const isDesktop = window.innerWidth >= 1024;

      if (isStandalone) {
        router.replace('/m');
      } else if (isDesktop) {
        router.replace('/admin');
      } else {
        // Mobile Safari — show "return to app" message
        setChecking(false);
      }
    }

    handleRedirect();
  }, [supabase, router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-3 text-sm text-slate-500">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm text-center">
        {/* Success icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-2">You&apos;re signed in!</h1>
        <p className="text-sm text-slate-500 mb-8">
          Return to the CaptureYourWork app to continue.
        </p>

        {/* Visual hint to go back to the app */}
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900">CaptureYourWork</p>
              <p className="text-xs text-slate-500">Tap the app icon on your home screen</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          You can close this browser tab.
        </p>
      </div>
    </div>
  );
}
