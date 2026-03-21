import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type NotificationEvent =
  | 'comment_reply'
  | 'comment_on_my_photo'
  | 'project_assigned'
  | 'task_assigned'
  | 'task_due_soon'
  | 'mention';

type NotificationChannel = 'email' | 'push';

interface ProfileRecord {
  org_id: string;
}

interface SettingsPayload {
  email_enabled?: boolean;
  push_enabled?: boolean;
  email_digest?: 'instant' | 'hourly' | 'daily' | 'weekly' | 'never';
  quiet_start?: string | null;
  quiet_end?: string | null;
}

interface PrefPayload {
  event?: NotificationEvent;
  channel?: NotificationChannel;
  enabled?: boolean;
}

const allowedEvents: NotificationEvent[] = [
  'comment_reply',
  'comment_on_my_photo',
  'project_assigned',
  'task_assigned',
  'task_due_soon',
  'mention',
];

export async function PUT(request: Request) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching authenticated user in notification settings route:', userError);
    return NextResponse.json({ error: 'Unable to verify current session.' }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle<ProfileRecord>();

  if (profileError) {
    console.error('Error loading profile in notification settings route:', profileError);
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const settings = body.settings as SettingsPayload | undefined;
  const prefs = Array.isArray(body.prefs) ? (body.prefs as PrefPayload[]) : [];

  if (!settings) {
    return NextResponse.json({ error: 'Missing settings payload.' }, { status: 400 });
  }

  const normalizedPrefs = prefs
    .map((pref) => ({
      user_id: user.id,
      org_id: profile.org_id,
      event: pref.event,
      channel: pref.channel,
      enabled: pref.enabled === undefined ? true : Boolean(pref.enabled),
    }))
    .filter(
      (pref) =>
        pref.event &&
        allowedEvents.includes(pref.event) &&
        (pref.channel === 'email' || pref.channel === 'push')
    ) as Array<{
      user_id: string;
      org_id: string;
      event: NotificationEvent;
      channel: NotificationChannel;
      enabled: boolean;
    }>;

  const { error: settingsError } = await supabase
    .from('notification_settings')
    .upsert(
      {
        user_id: user.id,
        org_id: profile.org_id,
        email_enabled: Boolean(settings.email_enabled),
        push_enabled: Boolean(settings.push_enabled),
        email_digest: settings.email_digest ?? 'instant',
        quiet_start: settings.quiet_start ?? null,
        quiet_end: settings.quiet_end ?? null,
      },
      { onConflict: 'user_id' }
    );

  if (settingsError) {
    console.error('Error saving notification settings:', settingsError);
    return NextResponse.json({ error: 'Unable to save settings.' }, { status: 500 });
  }

  if (normalizedPrefs.length > 0) {
    const { error: prefsError } = await supabase
      .from('notification_prefs')
      .upsert(normalizedPrefs, { onConflict: 'user_id,event,channel' });

    if (prefsError) {
      console.error('Error saving notification preferences:', prefsError);
      return NextResponse.json({ error: 'Unable to save notification preferences.' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
