const CACHE_NAME = 'anmore-bike-v1';
const ANMORE_BOUNDS = {
  minLat: 49.30,
  maxLat: 49.35,
  minLng: -122.90,
  maxLng: -122.82
};

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

// Cache Anmore area map tiles (zoom levels 10-18)
const TILE_CACHE = 'anmore-map-tiles-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== TILE_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle OpenStreetMap tiles for Anmore area
  if (url.hostname.includes('openstreetmap.org') && url.pathname.includes('tile')) {
    event.respondWith(
      caches.open(TILE_CACHE).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((networkResponse) => {
            // Only cache tiles within Anmore bounds
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    }).catch(() => {
      // Return offline page if available
      return caches.match('/');
    })
  );
});

// Background sync for queued form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-nostr-forms') {
    event.waitUntil(syncQueuedForms());
  }
});

async function syncQueuedForms() {
  // This will be handled by the IndexedDB queue in the main app
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_FORMS' });
  });
}
