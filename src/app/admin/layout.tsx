import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { SidebarNav } from './components/sidebar-nav';
import { AccountMenu } from './components/account-menu';

export const dynamic = 'force-dynamic';

interface ProfileRecord {
  org_id: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  organizations?: {
    name: string | null;
  } | null;
}

const navSections = [
  {
    label: 'Workspace',
    items: [
      { label: 'Projects', href: '/admin/projects', icon: 'projects' },
      { label: 'Photos', href: '/admin/photos', icon: 'photos' },
      { label: 'Users', href: '/admin/users', icon: 'users' },
      { label: 'Groups', href: '/admin/groups', icon: 'groups' },
      { label: 'Reports', href: '/admin/reports', icon: 'reports' },
      { label: 'Checklists', href: '/admin/checklists', icon: 'checklists' },
      { label: 'Map', href: '/admin/map', icon: 'map' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Reviews', href: '/admin/reviews', icon: 'reviews' },
      { label: 'Portfolio', href: '/admin/portfolio', icon: 'portfolio' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Integrations', href: '/admin/integrations', icon: 'integrations' },
      { label: 'Templates', href: '/admin/templates', icon: 'templates' },
    ],
  },
];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, first_name, last_name, role, organizations ( name )')
    .eq('user_id', user.id)
    .maybeSingle<ProfileRecord>();

  const initials = profile
    ? [profile.first_name?.[0], profile.last_name?.[0]]
        .filter(Boolean)
        .join('')
        .toUpperCase()
    : user.email?.slice(0, 2).toUpperCase() ?? 'U';

  const orgName =
    profile?.organizations?.name ??
    profile?.org_id ??
    'Organization';

  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    user.email ||
    'Account';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
          {/* Logo */}
          <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
              <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-tight">PhotoDoc</p>
              <p className="text-xs text-slate-500 leading-tight truncate max-w-[160px]">{orgName}</p>
            </div>
          </div>

          {/* Nav */}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <SidebarNav sections={navSections} />
          </div>

          {/* Account */}
          <div className="border-t border-slate-100 px-3 py-3">
            <AccountMenu
              initials={initials || 'U'}
              fullName={fullName}
              email={user.email ?? ''}
            />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile header */}
          <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
            <Link href="/admin/projects" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-900">PhotoDoc</span>
            </Link>
            <AccountMenu
              initials={initials || 'U'}
              fullName={fullName}
              email={user.email ?? ''}
            />
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
