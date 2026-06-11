// Service worker mínimo: habilita la instalación como PWA y permite abrir la
// app sin conexión (sirve el shell cacheado para las navegaciones).
const CACHE = 'palantir-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add('/')));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Solo gestionamos navegaciones: red primero, caché como respaldo offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/')),
    );
  }
});
