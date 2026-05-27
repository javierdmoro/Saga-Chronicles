const CACHE_NAME = 'saga_chronicle_v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignore live third party API requests, hot reloads, etc
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background to update cache (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Ignore offline network errors */});
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Offline backup
        return caches.match('/');
      });
    })
  );
});

// ==========================================
// PWA PUSH NOTIFICATIONS, BACKGROUND & PERIODIC SYNC
// ==========================================

self.addEventListener('push', (event) => {
  let data = { title: 'Saga Chronicle', body: 'Un desafío rúnico te espera en el Yggdrasil.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Saga Chronicle', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'explore', title: '🧙 Entrar al Gremio' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;

  if (action === 'close') {
    notification.close();
  } else {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
    notification.close();
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'saga-sync-pending') {
    event.waitUntil(
      self.registration.showNotification('Saga Chronicle Sync', {
        body: 'Sincronización en segundo plano completada con éxito. Datos del cofre resguardados.',
        icon: '/icon-192.png'
      })
    );
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'saga-periodic-update') {
    event.waitUntil(
      self.registration.showNotification('Saga Chronicle Segundo Plano', {
        body: 'Actualizaciones periódicas de eventos sincronizadas en segundo plano.',
        icon: '/icon-192.png'
      })
    );
  }
});

