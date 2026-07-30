const CACHE_NAME = 'incubapro-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/icon.png',
    '/icon-192.png',
    '/icon-512.png'
];

// Instalação: Faz o cache inicial dos assets estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Cacheando assets estáticos');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch(err => console.error('[SW] Falha ao cachear:', err))
    );
    self.skipWaiting(); // Força ativação imediata da nova versão
});

// Ativação: LIMPEZA RÍGIDA de caches antigos para evitar travamentos em atualizações
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Se o cache não for a versão mais recente, apaga
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log('[SW] Apagando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Assuma o controle de todos os clientes imediatamente
});

// Fetch: Estratégia Network-First, ignorando requisições para a API do Groq
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // REGRA RIGOROSA: Não interceptar chamadas de API externa (Groq)
    if (url.hostname === 'api.groq.com') {
        return; // Deixa o navegador lidar diretamente com a rede
    }

    // Para arquivos locais/estáticos: Network First
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Se a rede retornar sucesso, clona e salva no cache
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Se falhar a rede (offline), busca no cache
                return caches.match(event.request).then((response) => {
                    if (response) {
                        return response;
                    }
                    // Fallback caso não esteja no cache (ex: página não visitada ainda offline)
                    if (event.request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});
