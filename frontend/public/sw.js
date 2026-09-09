// App HTML references deployment-specific JavaScript and must stay fresh.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter((name) => name.startsWith('erp-system-'))
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate' || url.pathname === '/index.html') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
  }
  // Assets and API requests use the browser's normal network handling.
});
