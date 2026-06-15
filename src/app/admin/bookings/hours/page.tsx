import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BusinessHoursForm } from './business-hours-form';
import { CalendarFeed } from './calendar-feed';
import { GoogleCalendarConnect } from './google-calendar-connect';
import { buildIcalToken } from '@/lib/ical';

export const dynamic = 'force-dynamic';

interface ProfileRecord {
  org_id: string;
  role: string;
}

interface HoursRow {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export default async function BusinessHoursPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();
  if (!profile?.org_id) redirect('/admin');
  const canEdit = profile.role === 'admin' || profile.role === 'manager';

  const { data: hoursData } = await supabase
    .from('business_hours')
    .select('day_of_week, open_time, close_time, is_closed')
    .eq('org_id', profile.org_id);

  const hours: HoursRow[] = (hoursData ?? []) as HoursRow[];

  const { data: gcalConn } = await supabase
    .from('google_calendar_connections')
    .select('google_email, connected_at')
    .eq('org_id', profile.org_id)
    .maybeSingle<{ google_email: string; connected_at: string }>();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        <Link href="/admin/bookings" className="text-indigo-600 hover:text-indigo-700">
          ← Back to bookings
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Business hours</h1>
      <p className="mt-1 text-sm text-slate-500">
        Customers can only book during the hours you set here. Defaults to Mon–Sat 9:00–17:00 if you haven&apos;t saved anything.
      </p>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <BusinessHoursForm orgId={profile.org_id} initial={hours} canEdit={canEdit} />
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Block out personal calendar events</h2>
        <p className="mt-1 text-xs text-slate-500">
          Connect your Google Calendar and we&apos;ll automatically hide booking times that overlap with your personal events (doctor appointments, kids&apos; activities, etc.). Read-only — we never write to your calendar.
        </p>
        <GoogleCalendarConnect
          canEdit={canEdit}
          connectedEmail={gcalConn?.google_email ?? null}
          connectedAt={gcalConn?.connected_at ?? null}
        />
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Sync to your calendar</h2>
        <p className="mt-1 text-xs text-slate-500">
          Add this link to Google Calendar, Apple Calendar, or Outlook to see new bookings appear automatically. Treat it as private — anyone with the URL can subscribe.
        </p>
        <CalendarFeed token={buildIcalToken(profile.org_id)} />
      </div>
    </div>
  );
}
