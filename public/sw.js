// Service Worker for Chakki Book (Grinder Hub) PWA
const CACHE_NAME = 'chakkibook-v2.2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icon.svg',
  '/js/sync.js',
  '/js/state.js',
  '/js/i18n.js',
  '/js/api.js',
  '/js/events.js',
  '/js/utils/formatters.js',
  '/js/utils/print.js',
  '/js/utils/whatsapp.js',
  '/js/components/shell.js',
  '/js/components/rows.js',
  '/js/components/modals.js',
  '/js/components/tokenCard.js',
  '/js/views/authView.js',
  '/js/views/dashboardView.js',
  '/js/views/jobView.js',
  '/js/views/tokenView.js',
  '/js/views/customerView.js',
  '/js/views/reportView.js',
  '/js/views/settingsView.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never cache API requests
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Fetch fresh version in background and update cache
      const networkFetch = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
      return cached || networkFetch;
    })
  );
});
