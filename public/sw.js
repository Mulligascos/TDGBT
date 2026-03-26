// ─── CACHE VERSION — bump this string on every deploy to force cache clear ───
const CACHE_VERSION = 'tdg-v11';
const CACHE_NAME = `${CACHE_VERSION}-static`;

// Static assets to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/assets/TDG_LogoSmall.PNG',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
];

// Never cache these — always go to network
const NETWORK_ONLY = [
  'supabase.co',
  'arcgisonline.com',
  'unpkg.com',
  'openstreetmap.org',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ─── INSTALL — cache static assets ───────────────────────────────────────────
self.addEventListener('install', event => {
  // Skip waiting immediately — don't wait for old SW to be released
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
});

// ─── ACTIVATE — delete old caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      // Take control of all open tabs immediately
      return self.clients.claim();
    })
  );
});

// ─── FETCH — network-first for API/CDN, cache-first for static assets ────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Skip non-HTTP requests (chrome-extension etc)
  if (!url.startsWith('http')) return;

  // Always network-only for API and CDN requests
  if (NETWORK_ONLY.some(domain => url.includes(domain))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For JS/CSS chunks (hashed filenames) — network first, fall back to cache
  if (url.includes('/assets/') && (url.endsWith('.js') || url.endsWith('.css'))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For navigation requests (HTML) — always network first so app updates are seen
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Everything else — cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// ─── MESSAGE — allow app to trigger skipWaiting manually ─────────────────────
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
