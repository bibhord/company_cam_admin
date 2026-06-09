'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Client-side callback for magic links generated via `auth.admin.generateLink()`.
 * Supabase returns the session in the URL hash (#access_token=...), which only
 * the browser can read. The Supabase client auto-detects this on mount, writes
 * the session to cookies, then we hard-navigate so the middleware sees it.
 */
function MagicCallback() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/admin';
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClientComponentClient();

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        clearInterval(interval);
        window.location.href = next;
        return;
      }
      if (attempts >= 20) {
        clearInterval(interval);
        setError('Sign-in link is invalid or has expired.');
      }
    }, 150);

    return () => clearInterval(interval);
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
