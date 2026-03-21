import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { NotificationSettingsModal } from './notification-settings-modal';

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

interface SettingsRow {
  email_enabled: boolean;
  push_enabled: boolean;
  email_digest: 'instant' | 'hourly' | 'daily' | 'weekly' | 'never';
  quiet_start: string | null;
  quiet_end: string | null;
}

interface PrefRow {
  event: NotificationEvent;
  channel: NotificationChannel;
  enabled: boolean;
}

export default async function NotificationSettingsPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle<ProfileRecord>();

  if (!profile?.org_id) {
    notFound();
  }

  const { data: settings } = await supabase
    .from('notification_settings')
    .select('email_enabled, push_enabled, email_digest, quiet_start, quiet_end')
    .eq('user_id', user.id)
    .maybeSingle<SettingsRow>();

  const { data: prefs } = await supabase
    .from('notification_prefs')
    .select('event, channel, enabled')
    .eq('user_id', user.id)
    .eq('org_id', profile.org_id)
    .returns<PrefRow[]>();

  return (
    <NotificationSettingsModal
      initialSettings={{
        email_enabled: settings?.email_enabled ?? true,
        push_enabled: settings?.push_enabled ?? true,
        email_digest: settings?.email_digest ?? 'instant',
        quiet_start: settings?.quiet_start ?? null,
        quiet_end: settings?.quiet_end ?? null,
      }}
      initialPrefs={prefs ?? []}
    />
  );
}
