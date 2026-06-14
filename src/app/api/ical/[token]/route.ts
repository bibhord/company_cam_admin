import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { buildIcal, verifyIcalToken } from '@/lib/ical';

interface Booking {
  id: string;
  service_name: string;
  duration_min: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  notes: string | null;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
  updated_at: string;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const orgId = verifyIcalToken(token);
  if (!orgId) {
    return new Response('Invalid token', { status: 404 });
  }

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: org } = await svc
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .maybeSingle<{ name: string }>();
  if (!org) {
    return new Response('Org not found', { status: 404 });
  }

  // Limit window: last 30 days + future. Avoids unbounded growth.
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const startStr = start.toISOString().slice(0, 10);

  const { data: bookings } = await svc
    .from('bookings')
    .select('id, service_name, duration_min, customer_name, customer_email, customer_phone, notes, booking_date, booking_time, status, updated_at')
    .eq('org_id', orgId)
    .gte('booking_date', startStr)
    .order('booking_date');

  const ics = buildIcal(org.name ?? 'Bookings', (bookings ?? []) as Booking[]);

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="bookings.ics"',
      // Cache for 5 minutes so calendar apps don't hammer us.
      'Cache-Control': 'public, max-age=300',
    },
  });
}
