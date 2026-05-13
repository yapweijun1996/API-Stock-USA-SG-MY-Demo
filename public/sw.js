const CACHE_VERSION = 'stock-demo-v2';
const BASE_PATH = '/API-Stock-USA-SG-MY-Demo/';
const APP_SHELL = [
  BASE_PATH,
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}icons/icon.svg`,
  `${BASE_PATH}icons/maskable.svg`,
  `${BASE_PATH}icons/apple-touch-icon.svg`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_VERSION)
        .map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin || event.request.method !== 'GET') {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(BASE_PATH, copy));
          return response;
        })
        .catch(() => caches.match(BASE_PATH)),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => new Response('', { status: 504, statusText: 'Offline asset unavailable' }));
    }),
  );
});
