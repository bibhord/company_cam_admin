import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { r2SignedUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ slug: string; id: string }>;
}

export default async function PortfolioProjectPage({ params }: RouteParams) {
  const { slug, id } = await params;

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: org } = await svc
    .from('organizations')
    .select('id, name, portfolio_published')
    .eq('portfolio_slug', slug)
    .maybeSingle<{ id: string; name: string; portfolio_published: boolean }>();

  if (!org || !org.portfolio_published) notFound();

  const { data: project } = await svc
    .from('projects')
    .select('id, name, status, featured, created_at')
    .eq('id', id)
    .eq('org_id', org.id)
    .eq('featured', true)
    .eq('status', 'completed')
    .maybeSingle<{ id: string; name: string; status: string; featured: boolean; created_at: string }>();

  if (!project) notFound();

  const { data: photos } = await svc
    .from('photos')
    .select('id, name, object_key, created_at')
    .eq('project_id', project.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: true });

  const signed = await Promise.all(
    (photos ?? []).map(async (p) => ({
      ...p,
      url: p.object_key ? await r2SignedUrl(p.object_key, 3600).catch(() => null) : null,
    })),
  );

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
            </div>
            <span className="text-base font-bold text-slate-900">{org.name}</span>
          </Link>
        </div>
      </header>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <Link href="/" className="text-sm text-amber-600 hover:underline">
            ← All Projects
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold text-slate-900 sm:text-4xl">{project.name}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Completed {new Date(project.created_at).toLocaleDateString()}
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {signed.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="relative aspect-square bg-slate-100">
                  {p.url ? (
                    <Image
                      src={p.url}
                      alt={p.name ?? ''}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">No image</div>
                  )}
                </div>
              </div>
            ))}
            {signed.length === 0 && (
              <p className="col-span-full text-center text-slate-500">No photos yet.</p>
            )}
          </div>
        </div>
      </section>

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
