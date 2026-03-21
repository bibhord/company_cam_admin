import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SettingsClient } from './settings-client';
import type { ProfileRow } from '../types';

export default async function MySettingsPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching user for settings page:', userError);
  }

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, role, is_active, org_id, created_at')
    .eq('user_id', user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    console.error('Error loading profile for settings:', profileError);
  }

  if (!profile) {
    redirect('/admin');
  }

  return (
    <SettingsClient
      userEmail={user.email ?? ''}
      profile={profile}
    />
  );
}
