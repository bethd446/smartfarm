// Smart Farm Service Worker - offline-first basique pour 4G fluctuante CI
const CACHE_VERSION = 'sf-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Assets statiques à mettre en cache lors de l'installation
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/cheptel',
  '/alertes',
  '/manifest.json',
  '/favicon-32.png',
  '/favicon-48.png',
  '/android-icon-192.png',
  '/logo-smartfarm.svg',
];

// Install event : cache des assets statiques
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some assets:', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event : cleanup des vieux caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('sf-') && cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event : stratégie hybride
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // JAMAIS cacher les API Supabase (toujours network-first)
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request).catch((err) => {
        console.warn('[SW] Network failed for API:', request.url, err);
        return new Response(
          JSON.stringify({ error: 'Pas de connexion réseau', offline: true }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Assets statiques : cache-first (fonts, images, CSS, JS)
  if (
    request.destination === 'font' ||
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    url.pathname.startsWith('/_next/static')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          // Mettre en cache uniquement si succès
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Pages HTML : network-first avec fallback cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) {
            return cached;
          }
          // Fallback offline générique pour les pages
          if (request.mode === 'navigate') {
            return caches.match('/dashboard').then((fallback) => {
              return fallback || new Response('Offline - pas de cache disponible', {
                status: 503,
                headers: { 'Content-Type': 'text/plain' },
              });
            });
          }
        });
      })
  );
});

// Message handler pour force refresh du cache
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((name) => caches.delete(name)));
      })
    );
  }
});
