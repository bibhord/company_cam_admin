// PhotoDoc Service Worker
// -------------------------------------------------------
// Network-first strategy with cache fallback for offline support.
// Bump CACHE_VERSION to invalidate old caches after a deploy.
// -------------------------------------------------------

const CACHE_VERSION = 'photodoc-v1';

// App shell resources to pre-cache on install
const APP_SHELL = [
  '/m',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ---- Install: pre-cache the app shell ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  // Activate new SW immediately instead of waiting for old tabs to close
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
  // Start controlling all open clients immediately
  self.clients.claim();
});

// ---- Fetch: network-first with cache fallback ----
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (analytics, external APIs, etc.)
  if (!request.url.startsWith(self.location.origin)) return;

  // Skip Supabase / API calls — they should not be cached
  if (request.url.includes('/api/') || request.url.includes('/auth/')) return;

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Clone before caching because responses are single-use streams
        const clone = networkResponse.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
        return networkResponse;
      })
      .catch(() =>
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          // For navigation requests that aren't cached, return the cached
          // app shell so the SPA router can handle it.
          if (request.mode === 'navigate') {
            return caches.match('/m');
          }

          // Nothing we can do — let the browser show its default offline UI
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          });
        })
      )
  );
});
