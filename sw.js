const CACHE_NAME = 'routine-architect-v7';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './db.js',
  './generator.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// Install Service Worker
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching offline assets...');
      // Resilient precache: don't let one missing asset abort the whole install
      return Promise.all(
        ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn('[Service Worker] Failed to cache asset:', asset, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate Service Worker (Clean up old caches)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Cache-first with Network Fallback)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).catch((err) => {
        console.warn('[Service Worker] Resource fetch failed (offline & uncached):', e.request.url);
      });
    })
  );
});
