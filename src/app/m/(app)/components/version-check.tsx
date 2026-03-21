'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_INTERVAL = 30_000; // Check every 30 seconds
const VISIBILITY_CHECK = true; // Also check when app comes to foreground

export function VersionCheck() {
  const knownVersion = useRef<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch('/api/version', { cache: 'no-store' });
      if (!res.ok) return;
      const { version } = await res.json();

      if (knownVersion.current === null) {
        // First check — store the current version
        knownVersion.current = version;
      } else if (version !== knownVersion.current) {
        // Version changed — new deploy is live
        setUpdateAvailable(true);
      }
    } catch {
      // Network error — ignore
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkVersion();

    // Poll on interval
    const interval = setInterval(checkVersion, POLL_INTERVAL);

    // Check when app comes back to foreground (important for mobile)
    function handleVisibilityChange() {
      if (VISIBILITY_CHECK && document.visibilityState === 'visible') {
        checkVersion();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkVersion]);

  function handleUpdate() {
    // Clear service worker cache then reload
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    window.location.reload();
  }

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 px-4 py-2.5 text-center safe-top">
      <div className="flex items-center justify-center gap-3">
        <p className="text-sm font-medium text-white">New version available</p>
        <button
          onClick={handleUpdate}
          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-600 shadow-sm active:bg-amber-50"
        >
          Update Now
        </button>
      </div>
    </div>
  );
}
