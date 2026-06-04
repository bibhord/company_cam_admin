'use client';

import { useEffect } from 'react';

interface OneSignalPushSubscription {
  id: string | null;
  optedIn: boolean;
  optIn(): Promise<void>;
  addEventListener(
    event: 'change',
    handler: (e: { current: { id: string | null; optedIn: boolean } }) => void,
  ): void;
}

interface OneSignalSDK {
  init(config: {
    appId: string;
    allowLocalhostAsSecureOrigin?: boolean;
    notifyButton?: { enable: boolean };
    serviceWorkerPath?: string;
  }): Promise<void>;
  User: { PushSubscription: OneSignalPushSubscription };
}

declare global {
  interface Window {
    OneSignalDeferred?: Array<(os: OneSignalSDK) => void | Promise<void>>;
  }
}

async function saveSubscription(id: string) {
  await fetch('/api/admin/push-devices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription_id: id, platform: 'web' }),
  }).catch(() => null);
}

export function OneSignalInit() {
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) return;
    if (document.getElementById('onesignal-sdk')) return;

    window.OneSignalDeferred = window.OneSignalDeferred ?? [];
    window.OneSignalDeferred.push(async (os) => {
      await os.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: { enable: false },
        serviceWorkerPath: '/sw.js',
      });

      // Save immediately if already subscribed
      const { id, optedIn } = os.User.PushSubscription;
      if (optedIn && id) await saveSubscription(id);

      // Save whenever subscription changes
      os.User.PushSubscription.addEventListener('change', async (e) => {
        if (e.current.optedIn && e.current.id) {
          await saveSubscription(e.current.id);
        }
      });
    });

    const script = document.createElement('script');
    script.id = 'onesignal-sdk';
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  return null;
}

// Called from NotificationPrompt or a settings button to trigger browser permission dialog
export function oneSignalOptIn() {
  window.OneSignalDeferred = window.OneSignalDeferred ?? [];
  window.OneSignalDeferred.push(async (os) => {
    await os.User.PushSubscription.optIn();
  });
}
