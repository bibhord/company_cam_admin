const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? 'bookings@captureyourwork.com';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log('[email] RESEND_API_KEY not set — would send:', payload.subject, '→', payload.to);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: payload.to, subject: payload.subject, html: payload.html }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('[email] send failed:', res.status, body);
  }
}

export function bookingRequestEmailToOrg(params: {
  orgName: string;
  orgEmail: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceName: string;
  date: string;
  time: string;
  notes?: string | null;
  adminUrl: string;
}): EmailPayload {
  return {
    to: params.orgEmail,
    subject: `New booking request — ${params.serviceName}`,
    html: `
      <h2>New Booking Request</h2>
      <p><strong>Service:</strong> ${params.serviceName}</p>
      <p><strong>Date/Time:</strong> ${params.date} at ${params.time}</p>
      <p><strong>Customer:</strong> ${params.customerName}</p>
      <p><strong>Email:</strong> ${params.customerEmail}</p>
      ${params.customerPhone ? `<p><strong>Phone:</strong> ${params.customerPhone}</p>` : ''}
      ${params.notes ? `<p><strong>Notes:</strong> ${params.notes}</p>` : ''}
      <p><a href="${params.adminUrl}">View &amp; respond in CaptureYourWork →</a></p>
    `,
  };
}

export function bookingConfirmationEmail(params: {
  customerName: string;
  customerEmail: string;
  orgName: string;
  serviceName: string;
  date: string;
  time: string;
}): EmailPayload {
  return {
    to: params.customerEmail,
    subject: `Booking confirmed — ${params.orgName}`,
    html: `
      <h2>Your booking is confirmed!</h2>
      <p>Hi ${params.customerName},</p>
      <p>${params.orgName} has confirmed your appointment.</p>
      <p><strong>Service:</strong> ${params.serviceName}</p>
      <p><strong>Date/Time:</strong> ${params.date} at ${params.time}</p>
      <p>We look forward to seeing you!</p>
    `,
  };
}

export function bookingDeclinedEmail(params: {
  customerName: string;
  customerEmail: string;
  orgName: string;
  serviceName: string;
  date: string;
  time: string;
}): EmailPayload {
  return {
    to: params.customerEmail,
    subject: `Booking update — ${params.orgName}`,
    html: `
      <h2>Booking Update</h2>
      <p>Hi ${params.customerName},</p>
      <p>Unfortunately ${params.orgName} is unable to accommodate your request for <strong>${params.serviceName}</strong> on ${params.date} at ${params.time}.</p>
      <p>Please visit their booking page to find another time that works.</p>
    `,
  };
}
