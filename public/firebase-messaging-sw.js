// Firebase Cloud Messaging Service Worker for Background Web Push
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyBs2cAQIFuDjvT-_sqscHR7GIhMzAZXpS4",
  authDomain: "gen-lang-client-0675907373.firebaseapp.com",
  projectId: "gen-lang-client-0675907373",
  storageBucket: "gen-lang-client-0675907373.firebasestorage.app",
  messagingSenderId: "1008014518740",
  appId: "1:1008014518740:web:d0e58248865f6edbbd4e41"
});

const messaging = firebase.messaging();

// Handle Background Push Messages (When screen is locked or browser is in background)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || '뼈반집 실시간 알림';
  const notificationBody = payload.notification?.body || payload.data?.body || '새로운 업무/매출 업데이트가 등록되었습니다.';
  
  const notificationOptions = {
    body: notificationBody,
    icon: payload.notification?.icon || payload.data?.icon || 'https://placehold.co/192x192/A8462B/white?text=Ppyeo',
    badge: 'https://placehold.co/192x192/A8462B/white?text=Ppyeo',
    vibrate: [200, 100, 200, 100, 200],
    tag: payload.data?.tag || `fcm-push-${Date.now()}`,
    renotify: true,
    data: payload.data?.url || '/',
    requireInteraction: true
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Generic Push event fallback
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    if (data && (data.notification || data.data)) {
      const title = data.notification?.title || data.data?.title || '뼈반집 알림';
      const body = data.notification?.body || data.data?.body || '새로운 알림이 도착했습니다.';
      const options = {
        body: body,
        icon: data.notification?.icon || data.data?.icon || 'https://placehold.co/192x192/A8462B/white?text=Ppyeo',
        badge: 'https://placehold.co/192x192/A8462B/white?text=Ppyeo',
        vibrate: [200, 100, 200, 100, 200],
        tag: data.data?.tag || `push-${Date.now()}`,
        renotify: true,
        data: data.data?.url || '/',
        requireInteraction: true
      };
      event.waitUntil(self.registration.showNotification(title, options));
    }
  } catch (e) {
    console.warn('[firebase-messaging-sw.js] Push parse fallback:', e);
  }
});

// Click event handler when user taps notification banner on locked phone or notification center
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
