/* Calendar wallpaper: isolated cache, network-first index. */
'use strict';
const BASE = new URL('./', self.registration.scope);
const INDEX = new URL('index.html', BASE).href;
const PREFIX = 'calendar-wallpaper:' + BASE.pathname + ':';
const CACHE = PREFIX + '20261019-1119';
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const response = await fetch(INDEX, { cache: 'no-store' });
        if (!response.ok) throw new Error('index fetch failed: ' + response.status);
        const cache = await caches.open(CACHE);
        await cache.put(INDEX, response);
        await self.skipWaiting();
    })());
});
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== BASE.origin) return;
    if (url.pathname !== BASE.pathname && url.pathname !== new URL(INDEX).pathname) return;
    event.respondWith((async () => {
        try {
            const response = await fetch(request, { cache: 'no-store' });
            if (response.ok) {
                try {
                    const cache = await caches.open(CACHE);
                    await cache.put(INDEX, response.clone());
                } catch (_) {}
            }
            return response;
        } catch (error) {
            const cache = await caches.open(CACHE);
            const saved = await cache.match(INDEX);
            if (saved) return saved;
            throw error;
        }
    })());
});
