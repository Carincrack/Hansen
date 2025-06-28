const CACHE_NAME = 'hacienda-hansen-v2.0.0';
const LOGO_URL = 'https://i.ibb.co/mCDdH6wt/logo.jpg';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  '/service-worker.js',
  LOGO_URL,
  'logo/logo-192.png',
  'logo/logo-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Archivos en caché');
        return cache.addAll(urlsToCache);
      })
      .catch(error => console.error('Error en la instalación del Service Worker:', error))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activando...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Service Worker: Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-hours') {
    event.waitUntil(syncPendingHours());
  }
});

async function syncPendingHours() {
  try {
    const pendingActions = JSON.parse(localStorage.getItem('pendingActions') || '[]');
    if (pendingActions.length === 0) return;

    const res = await fetch('https://api.jsonbin.io/v3/b/6859f6548a456b7966b466c6/latest', {
      headers: { 'X-Master-Key': '$2a$10$CJN48O6SvqnObn0Z0zy0j.Vronnf/8J5ntOTNT5f4ZMhCsRguKcNe' }
    });
    const data = await res.json();
    let actuales = data.record || [];

    for (const action of pendingActions) {
      if (action.action === 'save') {
        actuales.push(action.data);
      }
    }

    const putRes = await fetch('https://api.jsonbin.io/v3/b/6859f6548a456b7966b466c6', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': '$2a$10$CJN48O6SvqnObn0Z0zy0j.Vronnf/8J5ntOTNT5f4ZMhCsRguKcNe'
      },
      body: JSON.stringify(actuales)
    });

    if (putRes.ok) {
      localStorage.setItem('cachedRegistros', JSON.stringify(actuales));
      localStorage.removeItem('pendingActions');
      self.registration.showNotification('Hacienda Hansen', {
        body: 'Horas pendientes sincronizadas correctamente',
        icon: LOGO_URL,
        badge: LOGO_URL
      });
    }
  } catch (error) {
    console.error('Error en sincronización:', error);
  }
}