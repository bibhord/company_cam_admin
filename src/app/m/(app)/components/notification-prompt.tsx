'use client';

import { useEffect, useState } from 'react';

export function NotificationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    // Show prompt after a short delay so it doesn't block initial load
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  async function handleAllow() {
    setShow(false);
    try {
      await Notification.requestPermission();
    } catch {
      // Safari may throw
    }
  }

  if (!show) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[200] p-4 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-4 shadow-xl border border-slate-200">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
            <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">Enable Notifications</p>
            <p className="mt-0.5 text-xs text-slate-500">Get notified about project updates, new photos, and task assignments.</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleAllow}
            className="flex-1 rounded-xl bg-amber-500 py-2 text-sm font-semibold text-white transition-colors active:bg-amber-600"
          >
            Allow
          </button>
          <button
            onClick={() => setShow(false)}
            className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 transition-colors active:bg-slate-50"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
