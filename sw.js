const CACHE_NAME = 'incubapro-v1';
const URLS = ['./', './index.html', './style.css', './app.js', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS)));
  self.skipWaiting();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if(e.request.method === 'GET') {
        return caches.open(CACHE_NAME).then(c => { c.put(e.request, res.clone()); return res; });
      }
      return res;
    }).catch(() => e.request.destination === 'document' ? caches.match('./index.html') : null))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))));
  self.clients.claim();
});
