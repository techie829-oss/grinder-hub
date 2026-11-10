// Service Worker for Chakki Book (Grinder Hub) PWA
const CACHE_NAME = 'chakkibook-v2.2.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/styles.css?v=2.2.0',
  '/app.js',
  '/app.js?v=2.2.0',
  '/manifest.json',
  '/icon.svg',
  '/js/sync.js',
  '/js/state.js',
  '/js/i18n.js',
  '/js/api.js',
  '/js/events.js',
  '/js/hardware/scaleBluetooth.js',
  '/js/hardware/scaleOcr.js',
  '/js/hardware/qrScanner.js',
  '/js/hardware/thermalPrinter.js',
  '/js/hardware/voiceCommander.js',
  '/js/hardware/whatsappNotify.js',
  '/js/hardware/hardwareModal.js',
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
  '/js/views/settingsView.js',
  '/js/views/adminView.js'
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

  // Network-First with Offline Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
