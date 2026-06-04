import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BookingsMobile } from './bookings-mobile';

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

export default async function MobileBookingsPage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/m/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .maybeSingle<Profile>();
  if (!profile?.org_id) redirect('/m/login');

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('booking_date')
    .order('booking_time');

  const canManage = profile.role === 'admin' || profile.role === 'manager';

  return (
    <BookingsMobile
      initialBookings={(bookings ?? []) as Booking[]}
      canManage={canManage}
    />
  );
}
