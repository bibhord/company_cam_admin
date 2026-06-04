import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { MobileHeader } from '../components/mobile-header';

export const dynamic = 'force-dynamic';

const ROOT = 'captureyourwork.com';

export default async function MobileWebsitePage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/m/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, language')
    .eq('user_id', user.id)
    .maybeSingle<{ org_id: string; language: string | null }>();
  if (!profile?.org_id) redirect('/m/login');

  const es = profile.language === 'es';
  const tx = {
    title: es ? 'Sitio web público' : 'Public website',
    showcase: es ? 'Muestra tu trabajo' : 'Showcase your work',
    publishDesc: es ? 'Publica un sitio web gratuito que muestra tus proyectos completados.' : 'Publish a free public website that displays your completed projects.',
    live: es ? 'EN VIVO' : 'LIVE',
    siteIsLive: es ? 'Sitio activo' : 'Site is live',
    tapLink: es ? 'Toca el enlace de arriba para ver tu sitio. Usa el administrador web para gestionar proyectos.' : 'Tap the link above to view your site. Use the web admin to manage projects.',
    manage: es ? 'Gestiona tu sitio' : 'Manage your site',
    setup: es ? 'Configura tu sitio' : 'Set up your site',
    opensEditor: es ? 'Abre el editor completo en tu navegador.' : 'Opens the full editor in your browser.',
  };

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: org } = await svc
    .from('organizations')
    .select('name, portfolio_slug, portfolio_published')
    .eq('id', profile.org_id)
    .maybeSingle<{ name: string; portfolio_slug: string | null; portfolio_published: boolean }>();

  const { count: featuredCount } = await svc
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', profile.org_id)
    .eq('featured', true)
    .eq('status', 'completed');

  const eligible = (featuredCount ?? 0) >= 2;
  const url = org?.portfolio_slug ? `https://${org.portfolio_slug}.${ROOT}` : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <MobileHeader title={tx.title} />

      <div className="px-4 py-6">
        {org?.portfolio_published && url ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">{tx.live}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">{tx.siteIsLive}</span>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener"
              className="mt-3 block break-all text-base font-bold text-emerald-700"
            >
              {url}
            </a>
            <p className="mt-2 text-xs text-emerald-700">
              {tx.tapLink}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">{tx.showcase}</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              {tx.publishDesc}
            </p>
            <p className={`mt-3 text-xs font-semibold ${eligible ? 'text-emerald-600' : 'text-amber-600'}`}>
              {featuredCount ?? 0} / 2 {es ? 'proyectos destacados y completados' : 'featured & completed projects'}
            </p>
          </div>
        )}

        <Link
          href="/admin/portfolio"
          className="mt-4 flex items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm active:bg-amber-600"
        >
          {org?.portfolio_published ? tx.manage : tx.setup}
        </Link>

        <p className="mt-3 text-center text-xs text-slate-400">
          {tx.opensEditor}
        </p>
      </div>
    </div>
  );
}
