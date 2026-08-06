const CACHE_NAME = 'incubapro-v1';

// Arquivos para cachear no primeiro acesso
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instalação: cacheia os arquivos principais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Ativação: limpa caches antigos se houver atualização
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepta requisições: Tenta a rede primeiro, senão usa o cache
self.addEventListener('fetch', (event) => {
  // Ignora requisições de API (Groq)
  if (event.request.url.includes('groq.com')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a rede funcionou, clona e salva no cache
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Se a rede falhou (offline), busca no cache
        return caches.match(event.request).then((response) => {
          // Fallback para a página principal se o arquivo específico não estiver no cache
          return response || caches.match('./index.html');
        });
      })
  );
});
