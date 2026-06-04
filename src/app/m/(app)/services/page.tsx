import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { MobileHeader } from '../components/mobile-header';
import { MobileServicesManager } from './services-mobile';

export const dynamic = 'force-dynamic';

interface Profile { org_id: string; role: string }

export default async function MobileServicesPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/m/login');
  const { data: profile } = await supabase
    .from('profiles').select('org_id, role').eq('user_id', user.id)
    .maybeSingle<Profile>();
  if (!profile?.org_id) redirect('/m/login');

  const [{ data: cats }, { data: svcs }] = await Promise.all([
    supabase.from('service_categories').select('*').eq('org_id', profile.org_id).order('sort_order').order('name'),
    supabase.from('services').select('*').eq('org_id', profile.org_id).order('sort_order').order('name'),
  ]);

  return (
    <div className="flex flex-col">
      <MobileHeader title="Services" />
      <MobileServicesManager
        initialCategories={cats ?? []}
        initialServices={svcs ?? []}
        canManage={profile.role === 'admin' || profile.role === 'manager'}
      />
    </div>
  );
}
