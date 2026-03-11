// TDG Portal — Service Worker
// Strategy: cache-first for static assets, network-first for API calls

const CACHE_NAME = 'tdg-portal-v1';

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/apple-touch-icon.png',
];

// Install — pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first for Supabase API, cache-first for everything else
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle http/https — ignore chrome-extension, data, blob etc.
  if (!url.protocol.startsWith('http')) return;

  // Always go to network for Supabase, Esri tiles, Leaflet CDN
  const networkOnly = [
    'supabase.co',
    'arcgisonline.com',
    'unpkg.com',
    'openstreetmap.org',
  ];
  if (networkOnly.some((domain) => url.hostname.includes(domain))) {
    return; // fall through to normal network fetch
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful GET responses for static assets
        if (
          response.ok &&
          event.request.method === 'GET' &&
          (url.pathname.match(/\.(js|css|png|jpg|gif|svg|woff2?|ttf)$/) ||
            url.pathname === '/' ||
            url.pathname === '/index.html')
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
