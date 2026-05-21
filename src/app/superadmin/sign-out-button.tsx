'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function SignOutButton() {
  const supabase = createClientComponentClient();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await supabase.auth.signOut();
    } catch {
      // ignore
    } finally {
      window.location.href = '/login';
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={busy}
      className="mt-1 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-50"
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
