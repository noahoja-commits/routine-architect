const CACHE_NAME = 'routine-architect-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './db.js',
  './generator.js',
  './manifest.json',
  './icon-512.png'
];

// Install Service Worker
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching offline assets...');
      return cache.addAll(ASSETS);
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
