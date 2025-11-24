import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { SidebarNav } from './components/sidebar-nav';
import { AccountMenu } from './components/account-menu';

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
      { label: 'Projects', href: '/admin/projects' },
      { label: 'Photos', href: '/admin/photos' },
      { label: 'Users', href: '/admin/users' },
      { label: 'Groups', href: '/admin/groups' },
      { label: 'Reports', href: '/admin/reports' },
      { label: 'Checklists', href: '/admin/checklists' },
      { label: 'Payments', href: '/admin/payments', badge: 'NEW' },
      { label: 'Map', href: '/admin/map' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Reviews', href: '/admin/reviews' },
      { label: 'Portfolio', href: '/admin/portfolio' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Integrations', href: '/admin/integrations' },
      { label: 'Templates', href: '/admin/templates' },
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col gap-6 border-r border-white/10 bg-slate-950/70 px-6 py-8 backdrop-blur lg:flex">
          <div className="space-y-4">
            <Link href="/admin/projects" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-lg font-semibold">
                {orgName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{orgName}</p>
                <p className="text-xs text-slate-400">Workspace</p>
              </div>
            </Link>
            <AccountMenu
              initials={initials || 'U'}
              fullName={[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email ?? 'Account'}
              email={user.email ?? ''}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <SidebarNav sections={navSections} />
          </div>
        </aside>

        <main className="flex-1 bg-slate-50 text-slate-900">
          <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
            <Link href="/admin/projects" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white">
                {orgName.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900">{orgName}</p>
                <p className="text-xs text-slate-500">Workspace</p>
              </div>
            </Link>
            <AccountMenu
              initials={initials || 'U'}
              fullName={[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email ?? 'Account'}
              email={user.email ?? ''}
            />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
