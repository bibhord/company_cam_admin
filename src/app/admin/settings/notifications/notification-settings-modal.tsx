'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type NotificationEvent =
  | 'comment_reply'
  | 'comment_on_my_photo'
  | 'project_assigned'
  | 'task_assigned'
  | 'task_due_soon'
  | 'mention';

type NotificationChannel = 'email' | 'push';

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

interface NotificationSettingsModalProps {
  initialSettings: SettingsRow;
  initialPrefs: PrefRow[];
}

type PrefMap = Record<NotificationEvent, Record<NotificationChannel, boolean>>;

const defaultEventCopy: Array<{
  key: NotificationEvent;
  title: string;
  description: string;
}> = [
  {
    key: 'comment_reply',
    title: 'Responds to my comments',
    description: 'If a user interacts with any photo after you, we will let you know.',
  },
  {
    key: 'comment_on_my_photo',
    title: "Comments on photos I've taken",
    description: "If there is activity on a photo you created, we will let you know.",
  },
];

const toggleBaseClasses =
  'relative inline-flex h-6 w-11 items-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';
const toggleCircleClasses =
  'inline-block h-5 w-5 transform rounded-full bg-white shadow transition';

export function NotificationSettingsModal({ initialSettings, initialPrefs }: NotificationSettingsModalProps) {
  const router = useRouter();
  const [emailEnabled, setEmailEnabled] = useState(initialSettings.email_enabled);
  const [pushEnabled, setPushEnabled] = useState(initialSettings.push_enabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const prefState = useMemo<PrefMap>(() => {
    const map: PrefMap = {
      comment_reply: { email: true, push: true },
      comment_on_my_photo: { email: true, push: true },
      project_assigned: { email: true, push: true },
      task_assigned: { email: true, push: true },
      task_due_soon: { email: true, push: true },
      mention: { email: true, push: true },
    };

    for (const pref of initialPrefs) {
      if (!map[pref.event]) continue;
      map[pref.event][pref.channel] = pref.enabled;
    }

    return map;
  }, [initialPrefs]);

  const [prefs, setPrefs] = useState<PrefMap>(prefState);

  const handleSave = async () => {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        settings: {
          email_enabled: emailEnabled,
          push_enabled: pushEnabled,
          email_digest: initialSettings.email_digest,
          quiet_start: initialSettings.quiet_start,
          quiet_end: initialSettings.quiet_end,
        },
        prefs: Object.entries(prefs).flatMap(([event, channels]) => [
          { event, channel: 'email', enabled: channels.email },
          { event, channel: 'push', enabled: channels.push },
        ]),
      };

      const response = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Unable to save notification settings.');
      }

      setSuccess('Notification settings updated.');
      router.refresh();
    } catch (err) {
      console.error('Error saving notification settings:', err);
      setError(err instanceof Error ? err.message : 'Unexpected error. Please try again.');
    } finally {
      setPending(false);
    }
  };

  const togglePref = (event: NotificationEvent, channel: NotificationChannel) => {
    setPrefs((prev) => ({
      ...prev,
      [event]: {
        ...prev[event],
        [channel]: !prev[event][channel],
      },
    }));
  };

  const closeModal = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/admin');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Notification Settings</h1>
            <p className="text-sm text-slate-500">Control how and when you receive updates.</p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close notification settings"
          >
            ×
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              I&apos;d like to receive notifications&hellip;
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <PreferenceToggle
                title="As emails"
                description="Notifications will be sent to your inbox."
                enabled={emailEnabled}
                onChange={() => setEmailEnabled((prev) => !prev)}
              />
              <PreferenceToggle
                title="As push notifications"
                description="Notifications will push to your device."
                enabled={pushEnabled}
                onChange={() => setPushEnabled((prev) => !prev)}
              />
            </div>
          </section>

          <hr className="border-slate-200" />

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Send me notifications when someone…
            </h2>
            <div className="space-y-3">
              {defaultEventCopy.map((entry) => (
                <div
                  key={entry.key}
                  className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-slate-900">{entry.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{entry.description}</p>
                  </div>
                  <div className="flex gap-3">
                    <Switch
                      label="Email"
                      enabled={prefs[entry.key].email && emailEnabled}
                      disabled={!emailEnabled}
                      onChange={() => togglePref(entry.key, 'email')}
                    />
                    <Switch
                      label="Push"
                      enabled={prefs[entry.key].push && pushEnabled}
                      disabled={!pushEnabled}
                      onChange={() => togglePref(entry.key, 'push')}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={closeModal}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {pending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreferenceToggle({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="pr-4">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <Switch enabled={enabled} onChange={onChange} />
    </div>
  );
}

function Switch({
  label,
  enabled,
  disabled,
  onChange,
}: {
  label?: string;
  enabled: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  const active = enabled && !disabled;
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`${toggleBaseClasses} ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-200 border-slate-300'} ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
      aria-pressed={active}
      aria-label={label ?? 'Toggle setting'}
    >
      <span
        className={`${toggleCircleClasses} ${active ? 'translate-x-5' : 'translate-x-1'}`}
      />
    </button>
  );
}
