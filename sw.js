// Forçado para v2 para limpar o cache anterior quebrado
const CACHE_NAME = 'incubapro-v2'; 

// Removidas as chamadas aos .png para evitar erro 404 que impedia a instalação
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

// Instalação
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Cacheando assets estáticos');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch(err => console.error('[SW] Falha ao cachear:', err))
    );
    self.skipWaiting(); 
});

// Ativação e Limpeza Rígida
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log('[SW] Apagando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); 
});

// Fetch: Network-First ignorando API do Groq
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Não interceptar chamadas de API externa
    if (url.hostname === 'api.groq.com') {
        return; 
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((response) => {
                    if (response) {
                        return response;
                    }
                    if (event.request.destination === 'document') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
}
