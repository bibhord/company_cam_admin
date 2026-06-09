'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Client-side callback for magic links generated via `auth.admin.generateLink()`.
 * Supabase returns the session in the URL hash (#access_token=...&refresh_token=...),
 * which only the browser can read. We parse it manually, call setSession() so the
 * auth-helpers client writes cookies, then hard-navigate so the middleware picks up
 * the session.
 */
function MagicCallback() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/admin';
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) {
        setError('Sign-in link is invalid or has expired.');
        return;
      }
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const errParam = params.get('error_description') || params.get('error');
      if (errParam) {
        setError(decodeURIComponent(errParam));
        return;
      }
      if (!access_token || !refresh_token) {
        setError('Sign-in link is invalid or has expired.');
        return;
      }

      const supabase = createClientComponentClient();
      const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
      if (setErr) {
        setError(setErr.message);
        return;
      }
      window.location.href = next;
    }
    run();
  }, [next]);

  return (
    <div className="text-center">
      {error ? (
        <>
          <p className="text-sm font-semibold text-red-600">{error}</p>
          <a href="/login" className="mt-3 inline-block text-sm text-amber-600 underline">
            Back to login
          </a>
        </>
      ) : (
        <p className="text-sm text-slate-500">Signing you in…</p>
      )}
    </div>
  );
}

export default function MagicCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Suspense fallback={<p className="text-sm text-slate-500">Signing you in…</p>}>
        <MagicCallback />
      </Suspense>
    </div>
  );
}
