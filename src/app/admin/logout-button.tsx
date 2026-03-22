'use client';

import { useTransition } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface LogoutButtonProps {
  variant?: 'primary' | 'ghost';
  className?: string;
}

export function LogoutButton({ variant = 'primary', className = '' }: LogoutButtonProps) {
  const [pending, startTransition] = useTransition();
  const supabase = createClientComponentClient();

  const handleLogout = () => {
    startTransition(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      await supabase.auth.signOut();
      window.location.href = '/login';
    });
  };

  const baseStyles =
    variant === 'ghost'
      ? 'w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-100'
      : 'inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className={`${baseStyles} ${className}`.trim()}
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
