const CACHE_NAME = 'incubapro-v5';

// Arquivos para cachear na instalação
const URLS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instala: cacheia todos os arquivos do app
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativa: limpa caches de versões antigas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve do cache primeiro, rede como fallback
self.addEventListener('fetch', event => {
  // Só intercepta requisições GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Se tem no cache, retorna
      if (cachedResponse) return cachedResponse;

      // Se não tem, busca na rede
      return fetch(event.request)
        .then(networkResponse => {
          // Se a resposta for válida, salva no cache para uso futuro
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Se falhou a rede e não tem cache, serve o index.html
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
