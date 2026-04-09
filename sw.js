const CACHE_NAME = 'apex-v1';

// Files to cache on install
const PRECACHE = [
  './APEX.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
];

// Install: cache all precache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local files strictly; CDN files best-effort
      return cache.addAll(['./APEX.html', './manifest.json'])
        .then(() => {
          return Promise.allSettled(
            PRECACHE.slice(2).map(url =>
              cache.add(url).catch(() => { /* CDN may block sw origin */ })
            )
          );
        });
    }).then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for local assets, network-first for CDN
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Cache-first strategy for same-origin and known CDN assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache valid responses from CDN and same origin
        if (
          response.ok &&
          (url.origin === self.location.origin ||
           url.hostname.includes('googleapis.com') ||
           url.hostname.includes('gstatic.com') ||
           url.hostname.includes('cloudflare.com'))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: return APEX.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./APEX.html');
        }
      });
    })
  );
});
