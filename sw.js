const APP_BASE = new URL('./', self.location.href);
const INDEX_URL = new URL('index.html', APP_BASE).href;
const CACHE_PREFIX = 'calendar-wallpaper:' + APP_BASE.pathname + ':';
const CACHE_NAME = CACHE_PREFIX + '20261019-0122';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch(INDEX_URL, { cache: 'reload' });
    if (!response.ok || response.redirected) throw new Error('index.html unavailable');
    const cache = await caches.open(CACHE_NAME);
    await cache.put(INDEX_URL, response);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    // Remove this app's entries only from the previous shared cache.
    // Retain unrelated entries and never delete the entire legacy cache.
    if (names.includes('calendar-pwa-v2')) {
      const legacy = await caches.open('calendar-pwa-v2');
      const entries = await legacy.keys();
      await Promise.all(entries.filter(request => {
        const url = new URL(request.url);
        return url.origin === APP_BASE.origin && url.pathname.startsWith(APP_BASE.pathname);
      }).map(request => legacy.delete(request)));
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;
  const url = new URL(request.url);
  if (url.origin !== APP_BASE.origin ||
      (url.pathname !== APP_BASE.pathname && url.pathname !== new URL(INDEX_URL).pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request, { cache: 'no-store' });
      if (response.ok && !response.redirected) await cache.put(INDEX_URL, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(INDEX_URL);
      if (cached) return cached;
      throw error;
    }
  })());
});
