/**
 * Service Worker con Estrategia Stale-While-Revalidate (SWR)
 * Aplicación: "Registro de eventos y crisis"
 */

const CACHE_NAME = 'registro-crisis-swr-v5';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './bitacora_offline.html'
];

// 1. Instalación: Precaching de recursos básicos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        // En caso de fallo parcial de precache, no bloquear instalación
        console.warn('[SW] Precache parcial:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación: Limpieza de versiones previas de caché y toma de control inmediata
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estrategia Fetch: Stale-While-Revalidate Robusto
self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET de protocolo http/https
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // A. Buscar en caché inmediatamente
      const cachedResponse = await cache.match(event.request);

      // B. Lanzar petición a la red en segundo plano (Revalidate)
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Si la respuesta es válida (200 u opaca), actualizar la caché
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            cache.put(event.request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          // Si la red falla por desconexión o latencia extrema:
          // Si es una navegación y no hubo match exacto, servir el fallback raíz
          if (event.request.mode === 'navigate') {
            const fallback = (await cache.match('./')) || (await cache.match('./index.html')) || (await cache.match('/'));
            if (fallback) return fallback;
          }
          return null;
        });

      // C. Estrategia SWR:
      // Si el recurso ya existe en caché, devolverlo INMEDIATAMENTE (0ms de bloqueo)
      if (cachedResponse) {
        return cachedResponse;
      }

      // Si no estaba en caché (primera carga), esperar la respuesta de la red
      const networkResponse = await fetchPromise;
      if (networkResponse) {
        return networkResponse;
      }

      // Si la red falló y era navegación de página, buscar fallback en caché
      if (event.request.mode === 'navigate') {
        const fallback = (await cache.match('./')) || (await cache.match('./index.html')) || (await cache.match('/'));
        if (fallback) return fallback;
      }

      // Si no hay respuesta disponible, devolver respuesta controlada
      return new Response('Contenido no disponible sin conexión', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
      });
    })
  );
});
