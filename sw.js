/* Offline shell. Bump CACHE when any file below changes. */
const CACHE = 'dryland-test-logger-v5';

/* Without these the app does not run: if one is missing the install must fail loudly. */
const CORE = ['./', 'index.html', 'catalog.js', 'app.js'];
/* Cosmetic. A missing icon must never cost the offline cache — that happened with
   icon.svg from 2026-08-07 to 2026-08-21: addAll rejects on a single 404, the install
   never completed, and the app silently needed the network to open. */
const EXTRAS = ['manifest.webmanifest', 'icon.svg', 'icon-180.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE).then(() => Promise.all(EXTRAS.map((u) => c.add(u).catch(() => {})))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
