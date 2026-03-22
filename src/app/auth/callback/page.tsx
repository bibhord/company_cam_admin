'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const next = searchParams.get('next') ?? '/m';

  useEffect(() => {
    async function handleCallback() {
      // The code may come as a query param (PKCE) or via hash fragment (implicit)
      const code = searchParams.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('OAuth callback error:', error);
          router.push('/m/login');
          return;
        }
      }

      // Check if we have a session now
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push(next);
      } else {
        // Wait for auth state change (hash fragment case)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_IN') {
            subscription.unsubscribe();
            router.push(next);
          }
        });

        // Fallback timeout
        setTimeout(() => {
          subscription.unsubscribe();
          router.push('/m/login');
        }, 5000);
      }
    }

    handleCallback();
  }, []);

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
