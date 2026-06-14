import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Playfair_Display } from 'next/font/google';
import { r2SignedUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap' });

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

interface CategoryRow { id: string; name: string; sort_order: number }
interface ServiceRow {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  duration_min: number;
  price_cents: number | null;
  price_type: 'fixed' | 'from';
  sort_order: number;
}

function formatPrice(cents: number | null, type: 'fixed' | 'from') {
  if (cents == null) return 'Quote on request';
  if (cents === 0) return 'Free';
  const dollars = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  return type === 'from' ? `From $${dollars}` : `$${dollars}`;
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
    description: org ? `${org.name} — view our work and services` : '',
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

  const [{ data: catRows }, { data: svcRows }] = await Promise.all([
    svc.from('service_categories').select('id, name, sort_order').eq('org_id', org.id).order('sort_order').order('name'),
    svc.from('services')
      .select('id, category_id, name, description, duration_min, price_cents, price_type, sort_order')
      .eq('org_id', org.id).eq('is_active', true)
      .order('sort_order').order('name'),
  ]);
  const categoryList = (catRows ?? []) as CategoryRow[];
  const serviceList = (svcRows ?? []) as ServiceRow[];
  const servicesByCat = new Map<string | null, ServiceRow[]>();
  for (const s of serviceList) {
    const k = s.category_id;
    if (!servicesByCat.has(k)) servicesByCat.set(k, []);
    servicesByCat.get(k)!.push(s);
  }

  const covers: Record<string, string | null> = {};
  for (const p of projectList) {
    const { data: photo } = await svc
      .from('photos')
      .select('object_key, url')
      .eq('project_id', p.id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ object_key: string | null; url: string | null }>();
    if (photo?.object_key) {
      covers[p.id] = await r2SignedUrl(photo.object_key, 3600).catch(() => photo.url ?? null);
    } else {
      covers[p.id] = photo?.url ?? null;
    }
  }

  const heroUrl = projectList.length > 0 ? covers[projectList[0].id] : null;

  const visibleCats = categoryList.filter((c) => (servicesByCat.get(c.id)?.length ?? 0) > 0);
  const uncategorizedServices = servicesByCat.get(null) ?? [];

  return (
    <div className="min-h-screen bg-white" style={{ scrollBehavior: 'smooth' } as React.CSSProperties}>

      {/* ── Sticky nav ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className={`text-lg font-bold text-slate-900 ${playfair.className}`}>{org.name}</span>
          <nav className="hidden items-center gap-8 sm:flex">
            {serviceList.length > 0 && (
              <a href="#services" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Services
              </a>
            )}
            {projectList.length > 0 && (
              <a href="#gallery" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Our Work
              </a>
            )}
            <a
              href="#contact"
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Get in Touch
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex min-h-screen items-center pt-16">
        {heroUrl ? (
          <Image
            src={heroUrl}
            alt={org.name}
            fill
            unoptimized
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-slate-900" />
        )}
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/20" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-32">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
            Welcome
          </p>
          <h1 className={`max-w-2xl text-5xl font-bold leading-tight text-white sm:text-7xl ${playfair.className}`}>
            {org.name}
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-white/75">
            Craftsmanship you can see. Browse our work and services below.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            {serviceList.length > 0 && (
              <a
                href="#services"
                className="rounded-lg bg-amber-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-amber-400"
              >
                Book a service
              </a>
            )}
            {projectList.length > 0 && (
              <a
                href="#gallery"
                className="rounded-lg border border-white/50 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                See Our Work
              </a>
            )}
          </div>
        </div>

        {/* scroll indicator */}
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce text-white/50">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </section>

      {/* ── Services ── */}
      {serviceList.length > 0 && (
        <section id="services" className="bg-stone-50 px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">What we offer</p>
            <h2 className={`mt-3 text-4xl font-bold text-slate-900 ${playfair.className}`}>
              Services
            </h2>
            <p className="mt-3 text-slate-500">Transparent pricing. No surprises.</p>

            <div className="mt-12 space-y-12">
              {visibleCats.map((cat) => (
                <div key={cat.id}>
                  <h3 className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                    <span className="inline-block h-px w-8 bg-amber-400" />
                    {cat.name}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(servicesByCat.get(cat.id) ?? []).map((s) => (
                      <div
                        key={s.id}
                        className="flex items-start justify-between gap-4 rounded-2xl border border-stone-200 bg-white px-6 py-5 shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{s.name}</p>
                          {s.description && (
                            <p className="mt-1 text-sm leading-relaxed text-slate-500">{s.description}</p>
                          )}
                          <p className="mt-2 text-xs text-slate-400">{s.duration_min} min</p>
                          <a
                            href={`/book/${slug}?service=${s.id}`}
                            className="mt-3 inline-block rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-400"
                          >
                            Book
                          </a>
                        </div>
                        <p className="shrink-0 text-base font-bold text-amber-600">
                          {formatPrice(s.price_cents, s.price_type)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {uncategorizedServices.length > 0 && (
                <div>
                  <h3 className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                    <span className="inline-block h-px w-8 bg-amber-400" />
                    More
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {uncategorizedServices.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-start justify-between gap-4 rounded-2xl border border-stone-200 bg-white px-6 py-5 shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{s.name}</p>
                          {s.description && (
                            <p className="mt-1 text-sm leading-relaxed text-slate-500">{s.description}</p>
                          )}
                          <p className="mt-2 text-xs text-slate-400">{s.duration_min} min</p>
                          <a
                            href={`/book/${slug}?service=${s.id}`}
                            className="mt-3 inline-block rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-400"
                          >
                            Book
                          </a>
                        </div>
                        <p className="shrink-0 text-base font-bold text-amber-600">
                          {formatPrice(s.price_cents, s.price_type)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Gallery ── */}
      {projectList.length > 0 && (
        <section id="gallery" className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">Portfolio</p>
            <h2 className={`mt-3 text-4xl font-bold text-slate-900 ${playfair.className}`}>
              Our Work
            </h2>
            <p className="mt-3 text-slate-500">Recent completed projects.</p>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projectList.map((p) => (
                <Link
                  key={p.id}
                  href={`/portfolio/${slug}/projects/${p.id}`}
                  className="group relative block overflow-hidden rounded-2xl bg-slate-100"
                  style={{ aspectRatio: '4/3' }}
                >
                  {covers[p.id] ? (
                    <Image
                      src={covers[p.id]!}
                      alt={p.name}
                      fill
                      unoptimized
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      No photo
                    </div>
                  )}
                  {/* hover overlay */}
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div>
                      <p className="text-base font-semibold text-white">{p.name}</p>
                      <p className="mt-1 text-xs text-white/70">
                        {new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {/* always-visible subtle label on mobile */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 sm:hidden">
                    <p className="text-sm font-semibold text-white">{p.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section id="contact" className="bg-slate-900 px-6 py-24 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Get started</p>
        <h2 className={`mt-4 text-4xl font-bold text-white sm:text-5xl ${playfair.className}`}>
          Ready to work together?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-slate-400">
          We&apos;d love to hear about your project. Reach out and let&apos;s make something great.
        </p>
        <a
          href={`mailto:?subject=Inquiry — ${org.name}`}
          className="mt-10 inline-block rounded-lg bg-amber-500 px-10 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-amber-400"
        >
          Get in Touch
        </a>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 bg-slate-900 px-6 py-8 text-center">
        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} {org.name}
          {' · '}
          <a
            href="https://captureyourwork.com"
            target="_blank"
            rel="noopener"
            className="text-amber-600 transition hover:text-amber-400"
          >
            Powered by CaptureYourWork
          </a>
        </p>
      </footer>
    </div>
  );
}
