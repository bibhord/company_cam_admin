import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BookingsManager } from './bookings-manager';

export const dynamic = 'force-dynamic';

interface Profile {
  org_id: string;
  role: string;
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
    .select('org_id, role')
    .eq('user_id', user.id)
    .maybeSingle<Profile>();
  if (!profile?.org_id) redirect('/login');

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('booking_date')
    .order('booking_time');

  const canManage = profile.role === 'admin' || profile.role === 'manager';

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:py-8">
      <div className="mb-5 lg:mb-6">
        <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">Bookings</h1>
        <p className="mt-1 text-xs text-slate-500 lg:text-sm">
          Manage incoming appointment requests.
        </p>
      </div>
      <BookingsManager
        initialBookings={(bookings ?? []) as Booking[]}
        canManage={canManage}
      />
    </div>
  );
}
