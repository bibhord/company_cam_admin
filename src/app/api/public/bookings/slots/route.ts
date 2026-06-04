import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const org_id = searchParams.get('org_id');
  const date = searchParams.get('date'); // YYYY-MM-DD
  const duration_min = parseInt(searchParams.get('duration_min') ?? '60', 10);

  if (!org_id || !date) return NextResponse.json({ error: 'org_id and date required' }, { status: 400 });

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const dayOfWeek = new Date(date + 'T12:00:00').getDay(); // use noon to avoid DST issues

  const { data: hours } = await svc
    .from('business_hours')
    .select('open_time, close_time, is_closed')
    .eq('org_id', org_id)
    .eq('day_of_week', dayOfWeek)
    .maybeSingle<{ open_time: string; close_time: string; is_closed: boolean }>();

  // If no hours configured, use default Mon-Sat 9-17
  const isClosed = hours?.is_closed ?? (dayOfWeek === 0); // default closed Sunday
  if (isClosed) return NextResponse.json({ slots: [] });

  const openTime = hours?.open_time ?? '09:00';
  const closeTime = hours?.close_time ?? '17:00';

  // Generate all possible slots
  function timeToMins(t: string) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }
  function minsToTime(m: number) {
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }

  const openMins = timeToMins(openTime);
  const closeMins = timeToMins(closeTime);
  const allSlots: string[] = [];
  for (let m = openMins; m + duration_min <= closeMins; m += 30) {
    allSlots.push(minsToTime(m));
  }

  // Fetch confirmed bookings for this org on this date
  const { data: existing } = await svc
    .from('bookings')
    .select('booking_time, duration_min')
    .eq('org_id', org_id)
    .eq('booking_date', date)
    .eq('status', 'confirmed');

  // Remove any slot that overlaps with an existing confirmed booking
  const bookedRanges = (existing ?? []).map((b: { booking_time: string; duration_min: number }) => ({
    start: timeToMins(b.booking_time.slice(0, 5)),
    end: timeToMins(b.booking_time.slice(0, 5)) + b.duration_min,
  }));

  const available = allSlots.filter((slot) => {
    const slotStart = timeToMins(slot);
    const slotEnd = slotStart + duration_min;
    return !bookedRanges.some((r) => slotStart < r.end && slotEnd > r.start);
  });

  return NextResponse.json({ slots: available });
}
