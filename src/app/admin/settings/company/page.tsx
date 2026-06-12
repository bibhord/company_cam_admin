import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CompanySettingsForm } from './company-settings-form';

export const dynamic = 'force-dynamic';

interface ProfileRecord {
  org_id: string | null;
  role: string;
  organizations: {
    id: string;
    name: string | null;
    portfolio_slug: string | null;
  } | null;
}

export default async function CompanySettingsPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role, organizations ( id, name, portfolio_slug )')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (!profile?.org_id || !profile.organizations) redirect('/admin');

  const canEdit = profile.role === 'admin' || profile.role === 'manager';

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Company Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        These details appear on your public portfolio site and in your account.
      </p>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <CompanySettingsForm
          initialName={profile.organizations.name ?? ''}
          initialSlug={profile.organizations.portfolio_slug ?? ''}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
