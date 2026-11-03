// Self-clearing Service Worker to evict any stale cached empty pages
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        self.registration.unregister();
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch directly from network without caching development assets
  event.respondWith(fetch(event.request));
});
