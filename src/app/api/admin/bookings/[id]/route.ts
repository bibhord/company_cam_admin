import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sendEmail, bookingConfirmationEmail, bookingDeclinedEmail } from '@/lib/email';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .maybeSingle<{ org_id: string; role: string }>();
  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { status?: string; admin_notes?: string };
  const { status, admin_notes } = body;
  if (!status || !['confirmed', 'declined', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: booking, error } = await svc
    .from('bookings')
    .update({ status, admin_notes: admin_notes ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .select()
    .single<{
      id: string;
      customer_name: string;
      customer_email: string;
      service_name: string;
      booking_date: string;
      booking_time: string;
      org_id: string;
    }>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send email to customer
  const { data: org } = await svc
    .from('organizations')
    .select('name')
    .eq('id', profile.org_id)
    .maybeSingle<{ name: string }>();
  const orgName = org?.name ?? 'The business';

  const emailParams = {
    customerName: booking.customer_name,
    customerEmail: booking.customer_email,
    orgName,
    serviceName: booking.service_name,
    date: booking.booking_date,
    time: booking.booking_time.slice(0, 5),
  };

  if (status === 'confirmed') {
    await sendEmail(bookingConfirmationEmail(emailParams)).catch(console.error);
  } else if (status === 'declined') {
    await sendEmail(bookingDeclinedEmail(emailParams)).catch(console.error);
  }

  return NextResponse.json(booking);
}
