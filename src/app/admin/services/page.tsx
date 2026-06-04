import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ServicesManager } from './services-manager';

export const dynamic = 'force-dynamic';

interface Profile { org_id: string; role: string }

export default async function AdminServicesPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles').select('org_id, role').eq('user_id', user.id)
    .maybeSingle<Profile>();
  if (!profile?.org_id) redirect('/login');

  const [{ data: cats }, { data: svcs }] = await Promise.all([
    supabase.from('service_categories').select('*').eq('org_id', profile.org_id).order('sort_order').order('name'),
    supabase.from('services').select('*').eq('org_id', profile.org_id).order('sort_order').order('name'),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:py-8">
      <div className="mb-5 lg:mb-6">
        <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">Services</h1>
        <p className="mt-1 text-xs text-slate-500 lg:text-sm">
          What you offer. Shows up on your public portfolio.
        </p>
      </div>
      <ServicesManager
        initialCategories={cats ?? []}
        initialServices={svcs ?? []}
        canManage={profile.role === 'admin' || profile.role === 'manager'}
      />
    </div>
  );
}
