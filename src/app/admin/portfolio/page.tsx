import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PortfolioManager } from './portfolio-manager';

export const dynamic = 'force-dynamic';

interface ProjectRow {
  id: string;
  name: string;
  status: string | null;
  featured: boolean;
  created_at: string;
  photo_count: number;
}

export default async function AdminPortfolioPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle<{ org_id: string }>();

  if (!profile?.org_id) redirect('/login');

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: org } = await svc
    .from('organizations')
    .select('id, name, portfolio_slug, portfolio_published')
    .eq('id', profile.org_id)
    .single<{ id: string; name: string; portfolio_slug: string | null; portfolio_published: boolean }>();

  const { data: projectsRaw } = await svc
    .from('projects')
    .select('id, name, status, featured, created_at')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  const projects = (projectsRaw ?? []) as Omit<ProjectRow, 'photo_count'>[];

  const ids = projects.map((p) => p.id);
  const { data: photoRows } = ids.length
    ? await svc.from('photos').select('project_id').in('project_id', ids).neq('status', 'deleted')
    : { data: [] as { project_id: string }[] };

  const photoCounts: Record<string, number> = {};
  for (const r of photoRows ?? []) {
    photoCounts[r.project_id] = (photoCounts[r.project_id] ?? 0) + 1;
  }

  const rows: ProjectRow[] = projects.map((p) => ({
    ...p,
    photo_count: photoCounts[p.id] ?? 0,
  }));

  const completedFeatured = rows.filter((p) => p.featured && p.status === 'completed').length;
  const suggestedSlug = user.email
    ? user.email
        .toLowerCase()
        .replace(/@/g, '-')
        .replace(/\./g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
    : '';

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:py-8">
      <div className="mb-5 lg:mb-6">
        <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">Public Portfolio</h1>
        <p className="mt-1 text-xs text-slate-500 lg:text-sm">
          Publish a public website showcasing your completed projects.
        </p>
      </div>

      <PortfolioManager
        orgName={org?.name ?? ''}
        slug={org?.portfolio_slug ?? null}
        published={org?.portfolio_published ?? false}
        suggestedSlug={suggestedSlug}
        projects={rows}
        completedFeaturedCount={completedFeatured}
      />
    </div>
  );
}
