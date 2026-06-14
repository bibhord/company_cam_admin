import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BookingsManager } from './bookings-manager';
import { createAdminT } from '@/lib/admin-i18n';
import type { AdminLocale } from '@/lib/admin-i18n';

export const dynamic = 'force-dynamic';

interface Profile {
  org_id: string;
  role: string;
  language: string | null;
}

interface Booking {
  id: string;
  org_id: string;
  service_id: string | null;
  service_name: string;
  duration_min: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  notes: string | null;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export default async function AdminBookingsPage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role, language')
    .eq('user_id', user.id)
    .maybeSingle<Profile>();
  if (!profile?.org_id) redirect('/login');

  const locale = (profile.language === 'es' ? 'es' : 'en') as AdminLocale;
  const t = createAdminT(locale);

  const { data: org } = await supabase
    .from('organizations')
    .select('portfolio_slug, portfolio_published')
    .eq('id', profile.org_id)
    .maybeSingle<{ portfolio_slug: string | null; portfolio_published: boolean }>();

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('booking_date')
    .order('booking_time');

  const canManage = profile.role === 'admin' || profile.role === 'manager';

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:py-8">
      <div className="mb-5 lg:mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">{t('admin.bookings.title')}</h1>
          <p className="mt-1 text-xs text-slate-500 lg:text-sm">
            {t('admin.bookings.description')}
          </p>
        </div>
        <Link
          href="/admin/bookings/hours"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Business hours
        </Link>
      </div>

      {!org?.portfolio_published && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Bookings are disabled until your portfolio is published.</p>
          <p className="mt-1 text-xs text-amber-800">
            Your public booking page only goes live once your portfolio is published. To publish, mark at least 2 projects as completed and featured, then go to{' '}
            <Link href="/admin/portfolio" className="font-medium text-amber-900 underline">Portfolio</Link> and click Publish.
          </p>
        </div>
      )}

      <BookingsManager
        initialBookings={(bookings ?? []) as Booking[]}
        canManage={canManage}
      />
    </div>
  );
}
