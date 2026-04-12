import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const navItems = [
  { label: 'Dashboard', href: '/superadmin' },
  { label: 'Organizations', href: '/superadmin/orgs' },
];

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin, first_name, last_name')
    .eq('user_id', user.id)
    .maybeSingle<{ is_super_admin: boolean; first_name: string | null; last_name: string | null }>();

  if (!profile?.is_super_admin) redirect('/admin');

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || user.email;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 border-r border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2.5 border-b border-slate-800 px-5 py-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-500">SuperAdmin</p>
              <p className="text-xs text-slate-500">CaptureYourWork Internal</p>
            </div>
          </div>

          <nav className="px-2 py-4 space-y-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="absolute bottom-0 w-56 border-t border-slate-800 px-4 py-3">
            <p className="truncate text-xs text-slate-500">{name}</p>
            <Link href="/admin" className="mt-0.5 text-xs text-amber-500 hover:text-amber-400">
              Back to app
            </Link>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
