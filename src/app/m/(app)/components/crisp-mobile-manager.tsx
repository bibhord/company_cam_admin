'use client';

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

const CRISP_WEBSITE_ID = '51fc2e33-c7e4-4f06-8e74-937fab1f1b1b';

let closedListenerRegistered = false;

export function openCrispChat() {
  if (typeof window === 'undefined') return;

  if (!window.$crisp) {
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.head.appendChild(script);
  }

  if (!closedListenerRegistered) {
    window.$crisp.push([
      'on',
      'chat:closed',
      () => {
        window.$crisp?.push(['do', 'chat:hide']);
      },
    ]);
    closedListenerRegistered = true;
  }

  window.$crisp.push(['do', 'chat:show']);
  window.$crisp.push(['do', 'chat:open']);
}
