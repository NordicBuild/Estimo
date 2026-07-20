const CACHE_NAME = 'estimo-cache-v1';
const DATA_CACHE_NAME = 'estimo-data-cache-v1';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline page');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (evt) => {
  // Supabase requests or other API requests: network first, then cache
  if (evt.request.url.includes('supabase.co')) {
    evt.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(evt.request)
          .then((response) => {
            if (response.status === 200) {
              cache.put(evt.request.url, response.clone());
            }
            return response;
          })
          .catch((err) => {
            return cache.match(evt.request);
          });
      })
    );
    return;
  }

  // Assets like PDFs or images: cache first, then network
  if (evt.request.url.includes('/storage/v1/object/public/') || evt.request.url.match(/\.(png|jpg|jpeg|pdf)$/)) {
    evt.respondWith(
      caches.match(evt.request).then((response) => {
        return response || fetch(evt.request).then((fetchRes) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(evt.request.url, fetchRes.clone());
            return fetchRes;
          });
        });
      })
    );
    return;
  }

  // For all other requests: network first, fallback to cache
  evt.respondWith(
    fetch(evt.request).catch(() => {
      return caches.match(evt.request).then((response) => {
        if (response) {
          return response;
        }
        // Fallback page if needed
      });
    })
  );
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-uploads') {
    event.waitUntil(syncUploads());
  }
});

async function syncUploads() {
  console.log('[ServiceWorker] Background sync for uploads started');
  // Implementation for syncing offline uploads using IndexedDB would go here
  // For now, we notify clients that sync was attempted
  const clientsList = await self.clients.matchAll();
  for (const client of clientsList) {
    client.postMessage({ type: 'SYNC_COMPLETE' });
  }
}
