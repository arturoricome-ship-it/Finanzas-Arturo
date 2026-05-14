// Service Worker — Finanzas Arturo
const CACHE = 'finanzas-v1';
const PRECACHE = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Nunca interceptar llamadas al backend de Netlify
  if (e.request.url.includes('/.netlify/') ||
      e.request.url.includes('script.google.com')) return;

  // Network-first para CDN de librerías (siempre actualizado)
  if (e.request.url.includes('cdn.jsdelivr.net')) {
    e.respondWith(
      fetch(e.request)
        .then(r => { const c = r.clone(); caches.open(CACHE).then(cache => cache.put(e.request, c)); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first para el HTML principal (funciona offline)
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(response => {
      if (response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
      }
      return response;
    }))
  );
});
