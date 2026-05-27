'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function PendingSignOutButton() {
  const [signingOut, setSigningOut] = useState(false);
  const supabase = createClientComponentClient();

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await supabase.auth.signOut();
      try { localStorage.clear(); } catch {}
      window.location.href = '/m/login';
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={signingOut}
      className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-60"
    >
      {signingOut ? 'Signing out…' : 'Sign Out'}
    </button>
  );
}
