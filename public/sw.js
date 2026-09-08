// Service Worker for Mobile & Desktop Notifications and PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through
});

// Allow client script to request SW notification display (Critical for Mobile Android / iOS)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title || '뼈반집 알림', {
        body: options?.body || '',
        icon: options?.icon || '/icon-192.png',
        badge: options?.badge || '/icon-192.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: options?.tag || `notification-${Date.now()}`,
        renotify: true,
        data: options?.data || '/',
        requireInteraction: false
      })
    );
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: '뼈반집 알림', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || '뼈반집 알림';
  const options = {
    body: data.body || '새로운 보고서가 도착했습니다.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: `push-${Date.now()}`,
    renotify: true,
    data: data.url || '/'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

