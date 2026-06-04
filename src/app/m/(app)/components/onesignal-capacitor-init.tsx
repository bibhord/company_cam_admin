'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import type { PushSubscriptionChangedState } from '@onesignal/capacitor-plugin';

async function saveToken(token: string) {
  await fetch('/api/admin/push-devices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription_id: token,
      platform: Capacitor.getPlatform(), // 'ios' | 'android'
    }),
  }).catch(() => null);
}

export function OneSignalCapacitorInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) return;

    import('@onesignal/capacitor-plugin').then(async (mod) => {
      const OneSignal = mod.default;

      await OneSignal.initialize(appId);

      // Request OS-level permission (iOS prompts natively, Android 13+ also prompts)
      await OneSignal.Notifications.requestPermission(true);

      // Save token if already subscribed
      const [token, optedIn] = await Promise.all([
        OneSignal.User.pushSubscription.getTokenAsync(),
        OneSignal.User.pushSubscription.getOptedInAsync(),
      ]);
      if (optedIn && token) await saveToken(token);

      // Save whenever subscription changes
      OneSignal.User.pushSubscription.addEventListener(
        'change',
        async (event: PushSubscriptionChangedState) => {
          if (event.current.optedIn && event.current.token) {
            await saveToken(event.current.token);
          }
        },
      );
    });
  }, []);

  return null;
}
