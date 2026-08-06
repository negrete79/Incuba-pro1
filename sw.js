const CACHE_NAME = 'incubapro-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// Instala o Service Worker e guarda os arquivos no cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Abrindo cache e salvando arquivos offline');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch(err => console.log('Erro ao cachear:', err))
  );
  self.skipWaiting(); // Ativa imediatamente
});

// Intercepta as requisições de rede. Se não tiver internet, usa o cache.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Se achou no cache, retorna. Se não, busca na internet.
        return response || fetch(event.request).then((networkResponse) => {
          // Se for uma requisição GET, salva a nova versão no cache
          if(event.request.method === 'GET') {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // Se cair aqui, está sem internet e o arquivo não está no cache
        if (event.request.destination === 'document') {
          return caches.match('./index.html'); // Garante que a página carregue
        }
      })
  );
});

// Limpa caches antigos quando o sw.js é atualizado
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Assume o controle da aba imediatamente
});
