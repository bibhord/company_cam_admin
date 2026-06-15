/**
 * Google Calendar OAuth + free/busy helpers.
 *
 * Each org may connect ONE Google account whose primary calendar is read
 * by the public bookings slots endpoint to block times the admin is busy.
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly openid email';

function clientId(): string {
  const v = process.env.GOOGLE_CLIENT_ID;
  if (!v) throw new Error('GOOGLE_CLIENT_ID not set');
  return v;
}
function clientSecret(): string {
  const v = process.env.GOOGLE_CLIENT_SECRET;
  if (!v) throw new Error('GOOGLE_CLIENT_SECRET not set');
  return v;
}
function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.captureyourwork.com';
}
function redirectUri(): string {
  return `${appUrl()}/api/admin/google-calendar/callback`;
}

export function buildOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent', // force refresh_token on re-connect
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface TokenExchangeResult {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenExchangeResult> {
  const body = new URLSearchParams({
    code,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code',
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TokenExchangeResult;
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId(),
    client_secret: clientSecret(),
    grant_type: 'refresh_token',
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Refresh failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

interface IdTokenClaims {
  email?: string;
  email_verified?: boolean;
}

export function decodeIdTokenEmail(idToken: string | undefined): string | null {
  if (!idToken) return null;
  const parts = idToken.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')) as IdTokenClaims;
    return payload.email ?? null;
  } catch {
    return null;
  }
}

interface BusyInterval {
  start: string; // ISO
  end: string;   // ISO
}

/**
 * Fetch busy intervals on a given calendar between two timestamps.
 * Returns an empty array on any failure (so booking flow never breaks if
 * Google is unreachable).
 */
export async function fetchBusyIntervals(
  refreshToken: string,
  calendarId: string,
  timeMinISO: string,
  timeMaxISO: string,
): Promise<BusyInterval[]> {
  let accessToken: string;
  try {
    accessToken = await refreshAccessToken(refreshToken);
  } catch (err) {
    console.error('[google-cal] refresh failed:', err);
    return [];
  }

  try {
    const res = await fetch(`${GOOGLE_CALENDAR_API}/freeBusy`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: timeMinISO,
        timeMax: timeMaxISO,
        items: [{ id: calendarId }],
      }),
    });
    if (!res.ok) {
      console.error('[google-cal] freeBusy', res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as {
      calendars?: Record<string, { busy?: BusyInterval[] }>;
    };
    return data.calendars?.[calendarId]?.busy ?? [];
  } catch (err) {
    console.error('[google-cal] freeBusy threw:', err);
    return [];
  }
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
    method: 'POST',
  }).catch(() => null);
}
