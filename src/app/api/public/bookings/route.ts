import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendEmail, bookingRequestEmailToOrg } from '@/lib/email';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const {
    org_id, service_id, service_name, duration_min, customer_name, customer_email,
    customer_phone, notes, booking_date, booking_time,
  } = body as {
    org_id: string;
    service_id?: string;
    service_name: string;
    duration_min?: number;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    notes?: string;
    booking_date: string;
    booking_time: string;
  };

  if (!org_id || !service_name || !customer_name || !customer_email || !booking_date || !booking_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Validate booking_date is in the future
  const bookingDateObj = new Date(booking_date + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (bookingDateObj < today) {
    return NextResponse.json({ error: 'Booking date must be in the future' }, { status: 400 });
  }

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Verify org is published
  const { data: org } = await svc
    .from('organizations')
    .select('id, name')
    .eq('id', org_id)
    .eq('portfolio_published', true)
    .maybeSingle<{ id: string; name: string }>();
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  const { data: booking, error } = await svc
    .from('bookings')
    .insert({
      org_id,
      service_id: service_id || null,
      service_name,
      duration_min: duration_min ?? 60,
      customer_name,
      customer_email,
      customer_phone: customer_phone || null,
      notes: notes || null,
      booking_date,
      booking_time,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify org admin
  const { data: adminProfile } = await svc
    .from('profiles')
    .select('user_id')
    .eq('org_id', org_id)
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle<{ user_id: string }>();
  if (adminProfile) {
    const { data: authUser } = await svc.auth.admin.getUserById(adminProfile.user_id);
    if (authUser.user?.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.captureyourwork.com';
      await sendEmail(
        bookingRequestEmailToOrg({
          orgName: org.name,
          orgEmail: authUser.user.email,
          customerName: customer_name,
          customerEmail: customer_email,
          customerPhone: customer_phone,
          serviceName: service_name,
          date: booking_date,
          time: booking_time,
          notes,
          adminUrl: `${appUrl}/admin/bookings`,
        }),
      ).catch(console.error);
    }
  }

  return NextResponse.json(booking, { status: 201 });
}
