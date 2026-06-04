import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { Playfair_Display } from 'next/font/google';
import { BookingForm } from './booking-form';

export const dynamic = 'force-dynamic';

const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap' });

interface OrgRecord {
  id: string;
  name: string;
  portfolio_published: boolean;
}

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

interface CategoryRow {
  id: string;
  name: string;
  sort_order: number;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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
    title: org ? `Book with ${org.name}` : 'Book an appointment',
    description: org ? `Schedule a service with ${org.name}` : '',
  };
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { slug } = await params;
  const { service: preselectedServiceId } = await searchParams;

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

  const [{ data: catRows }, { data: svcRows }] = await Promise.all([
    svc
      .from('service_categories')
      .select('id, name, sort_order')
      .eq('org_id', org.id)
      .order('sort_order')
      .order('name'),
    svc
      .from('services')
      .select('id, category_id, name, description, duration_min, price_cents, price_type, sort_order')
      .eq('org_id', org.id)
      .eq('is_active', true)
      .order('sort_order')
      .order('name'),
  ]);

  const categories = (catRows ?? []) as CategoryRow[];
  const services = (svcRows ?? []) as ServiceRow[];

  if (services.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-6 text-center">
        <div>
          <h1 className={`text-3xl font-bold text-slate-900 ${playfair.className}`}>{org.name}</h1>
          <p className="mt-4 text-slate-500">No services are currently available for booking.</p>
          <a href={`/portfolio/${slug}`} className="mt-6 inline-block text-sm text-amber-600 hover:underline">
            ← Back to portfolio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <a
            href={`/portfolio/${slug}`}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back
          </a>
          <span className={`text-base font-bold text-slate-900 ${playfair.className}`}>{org.name}</span>
          <div className="w-12" />
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className={`mb-6 text-2xl font-bold text-slate-900 sm:text-3xl ${playfair.className}`}>
          Book an appointment
        </h1>
        <BookingForm
          orgId={org.id}
          orgName={org.name}
          services={services}
          categories={categories}
          preselectedServiceId={preselectedServiceId ?? null}
          playfairClass={playfair.className}
        />
      </div>
    </div>
  );
}
