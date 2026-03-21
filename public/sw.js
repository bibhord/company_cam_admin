// PhotoDoc Service Worker
// -------------------------------------------------------
// Network-first strategy with cache fallback for offline support.
// HTML pages are never cached to ensure fresh content on each load.
// Only static assets (JS, CSS, images, icons) are cached for offline.
// -------------------------------------------------------

const CACHE_VERSION = 'photodoc-v2';

// Static assets to pre-cache on install
const APP_SHELL = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ---- Install: pre-cache static assets ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ---- Activate: clean up old caches ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ---- Fetch: network-first, only cache static assets ----
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) return;

  // Never cache API calls, auth, or version checks
  if (request.url.includes('/api/') || request.url.includes('/auth/')) return;

  // Never cache HTML/navigation — always go to network for fresh content
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response('Offline — please check your connection and try again.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' },
        });
      })
    );
    return;
  }

  // For static assets (JS, CSS, images): network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        const clone = networkResponse.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
        return networkResponse;
      })
      .catch(() =>
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          });
        })
      )
  );
});
