import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { r2SignedUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

interface OrgRecord {
  id: string;
  name: string;
  portfolio_published: boolean;
}

interface ProjectRecord {
  id: string;
  name: string;
  status: string | null;
  created_at: string;
}

export async function generateMetadata({ params }: RouteParams) {
  const { slug } = await params;
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: org } = await svc
    .from('organizations')
    .select('name')
    .eq('portfolio_slug', slug)
    .eq('portfolio_published', true)
    .maybeSingle<{ name: string }>();
  return {
    title: org?.name ?? 'Portfolio',
    description: org ? `See ${org.name}'s recent projects` : '',
  };
}

export default async function PortfolioPage({ params }: RouteParams) {
  const { slug } = await params;

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: org } = await svc
    .from('organizations')
    .select('id, name, portfolio_published')
    .eq('portfolio_slug', slug)
    .maybeSingle<OrgRecord>();

  if (!org || !org.portfolio_published) notFound();

  const { data: projects } = await svc
    .from('projects')
    .select('id, name, status, created_at')
    .eq('org_id', org.id)
    .eq('featured', true)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  const projectList = (projects ?? []) as ProjectRecord[];

  // Grab cover photo per project (most recent)
  const covers: Record<string, string | null> = {};
  for (const p of projectList) {
    const { data: photo } = await svc
      .from('photos')
      .select('object_key')
      .eq('project_id', p.id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ object_key: string }>();
    covers[p.id] = photo?.object_key
      ? await r2SignedUrl(photo.object_key, 3600).catch(() => null)
      : null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
            </div>
            <span className="text-base font-bold text-slate-900">{org.name}</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-slate-100 bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            {org.name}
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            A look at our recent work.
          </p>
        </div>
      </section>

      {/* Projects grid */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-2xl font-bold text-slate-900">Recent Projects</h2>

          {projectList.length === 0 ? (
            <p className="text-center text-slate-500">No completed projects to show yet.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projectList.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-amber-300 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {covers[p.id] ? (
                      <Image
                        src={covers[p.id]!}
                        alt={p.name}
                        fill
                        unoptimized
                        className="object-cover transition group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600">
                      {p.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Completed {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-6 py-8 text-center">
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} {org.name}
          {' · '}
          <a href="https://captureyourwork.com" target="_blank" rel="noopener" className="text-amber-600 hover:underline">
            Powered by CaptureYourWork
          </a>
        </p>
      </footer>
    </div>
  );
}
