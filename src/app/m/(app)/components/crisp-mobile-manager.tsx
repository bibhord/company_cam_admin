'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    $crisp?: unknown[];
  }
}

export function CrispMobileManager() {
  useEffect(() => {
    function hide() {
      if (window.$crisp) {
        window.$crisp.push(['do', 'chat:hide']);
      }
    }
    hide();
    const onClosed = () => hide();
    if (window.$crisp) {
      window.$crisp.push(['on', 'chat:closed', onClosed]);
    }

    const interval = setInterval(hide, 1000);
    const stopPolling = setTimeout(() => clearInterval(interval), 10_000);

    return () => {
      clearInterval(interval);
      clearTimeout(stopPolling);
    };
  }, []);

  return null;
}

export function openCrispChat() {
  if (typeof window === 'undefined' || !window.$crisp) return;
  window.$crisp.push(['do', 'chat:show']);
  window.$crisp.push(['do', 'chat:open']);
}
