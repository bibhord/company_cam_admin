import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LogoutButton } from '../../logout-button';
import { ProjectForm } from './project-form';

interface ProfileRecord {
  org_id: string;
  is_admin: boolean;
}

export default async function NewProjectPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching authenticated user:', userError);
  }

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, is_admin')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError) {
    console.error('Error loading profile:', profileError);
    return (
      <div className="p-8 text-red-500">
        Unable to load profile information. Please verify your Supabase policies and try again.
      </div>
    );
  }

  if (!profile || !profile.is_admin) {
    return (
      <div className="p-8 text-red-500">
        You do not have permission to create projects from the admin panel.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              <Link href="/admin" className="text-indigo-600 hover:text-indigo-700">
                ← Back to dashboard
              </Link>
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Create a Project</h1>
            <p className="mt-2 text-sm text-gray-600">
              Launch a project for your organization. Team members can begin capturing photos once it is created.
            </p>
          </div>
          <LogoutButton />
        </header>

        <ProjectForm />
      </div>
    </div>
  );
}
