import { createHmac } from 'node:crypto';

// HMAC-based feed tokens: no DB column needed. Token = `${orgId}-${sig}` where
// sig = first 16 chars of base64url-encoded HMAC(SERVICE_ROLE_KEY, orgId).
// If the service-role key is ever rotated, all calendar URLs invalidate —
// which is the correct behavior on a credential rotation.
function secret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildIcalToken(orgId: string): string {
  const sig = b64url(createHmac('sha256', secret()).update(orgId).digest()).slice(0, 16);
  return `${orgId}.${sig}`;
}

export function verifyIcalToken(token: string): string | null {
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;
  const orgId = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = b64url(createHmac('sha256', secret()).update(orgId).digest()).slice(0, 16);
  if (sig.length !== expected.length) return null;
  // Constant-time-ish compare
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? orgId : null;
}

interface IcalBooking {
  id: string;
  service_name: string;
  duration_min: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  notes: string | null;
  booking_date: string; // YYYY-MM-DD
  booking_time: string; // HH:MM[:SS]
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
  updated_at: string;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toLocalIcsDateTime(date: string, time: string): string {
  // Floating local time (no TZ designator) — see RFC 5545. The calendar app
  // displays the wall-clock time as-typed regardless of viewer TZ, which
  // matches "appointment at 2pm" semantics for on-site work.
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.slice(0, 5).split(':').map(Number);
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
}

function addMinutes(date: string, time: string, minutes: number): { date: string; time: string } {
  const dt = new Date(`${date}T${time.slice(0, 5)}:00`);
  dt.setMinutes(dt.getMinutes() + minutes);
  const d = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const t = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  return { date: d, time: t };
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function fold(line: string): string {
  // RFC 5545: lines longer than 75 octets should be folded with CRLF + space.
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    const end = Math.min(i + (i === 0 ? 75 : 74), line.length);
    chunks.push((i === 0 ? '' : ' ') + line.slice(i, end));
    i = end;
  }
  return chunks.join('\r\n');
}

export function buildIcal(orgName: string, bookings: IcalBooking[]): string {
  const cal: string[] = [];
  cal.push('BEGIN:VCALENDAR');
  cal.push('VERSION:2.0');
  cal.push('PRODID:-//CaptureYourWork//Bookings//EN');
  cal.push('CALSCALE:GREGORIAN');
  cal.push('METHOD:PUBLISH');
  cal.push(fold(`X-WR-CALNAME:Bookings - ${escapeText(orgName)}`));
  cal.push(fold(`NAME:Bookings - ${escapeText(orgName)}`));

  for (const b of bookings) {
    if (b.status === 'cancelled' || b.status === 'declined') continue;
    const start = toLocalIcsDateTime(b.booking_date, b.booking_time);
    const endDt = addMinutes(b.booking_date, b.booking_time, b.duration_min);
    const end = toLocalIcsDateTime(endDt.date, endDt.time);
    const stamp = new Date(b.updated_at).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const summary = `${b.service_name} — ${b.customer_name}`;
    const description = [
      `Customer: ${b.customer_name}`,
      `Email: ${b.customer_email}`,
      b.customer_phone ? `Phone: ${b.customer_phone}` : '',
      b.notes ? `Notes: ${b.notes}` : '',
    ].filter(Boolean).join('\n');

    cal.push('BEGIN:VEVENT');
    cal.push(`UID:booking-${b.id}@captureyourwork.com`);
    cal.push(`DTSTAMP:${stamp}`);
    cal.push(`DTSTART:${start}`);
    cal.push(`DTEND:${end}`);
    cal.push(fold(`SUMMARY:${escapeText(summary)}`));
    if (description) cal.push(fold(`DESCRIPTION:${escapeText(description)}`));
    cal.push(`STATUS:${b.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`);
    cal.push('END:VEVENT');
  }

  cal.push('END:VCALENDAR');
  return cal.join('\r\n') + '\r\n';
}
