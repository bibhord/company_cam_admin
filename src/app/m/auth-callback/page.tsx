'use client';

import { useEffect } from 'react';

/**
 * Bridge page for Capacitor OAuth.
 *
 * Flow: Google → Supabase → this HTTPS page (loads in SFSafariViewController)
 *       → redirects to custom URL scheme → iOS fires appUrlOpen → app handles it.
 *
 * This avoids the unreliable direct custom-scheme redirect from Supabase.
 */
export default function AuthCallbackBridge() {
  useEffect(() => {
    // Preserve both query params (PKCE: ?code=...) and hash (implicit: #access_token=...)
    const params = window.location.search;
    const hash = window.location.hash;
    window.location.href = `com.captureyourwork.app://auth/callback${params}${hash}`;
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Signing you in...</p>
    </div>
  );
}
