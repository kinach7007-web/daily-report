// Firebase Cloud Messaging Service Worker for Background Web Push
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyB3HGTq_x6WnylVXKKOJpau-dJxD7igYGk",
  authDomain: "daily-report-bb.firebaseapp.com",
  projectId: "daily-report-bb",
  storageBucket: "daily-report-bb.firebasestorage.app",
  messagingSenderId: "148260545141",
  appId: "1:148260545141:web:021631eceb726c53600e3c"
});

const messaging = firebase.messaging();

// Handle Background Push Messages (When screen is locked or browser is in background)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received via FCM SDK:', payload);
  
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

// Direct Web Message handler from foreground client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title || '뼈반집 알림', {
        body: options?.body || '',
        icon: options?.icon || 'https://placehold.co/192x192/A8462B/white?text=Ppyeo',
        badge: options?.badge || 'https://placehold.co/192x192/A8462B/white?text=Ppyeo',
        vibrate: [200, 100, 200, 100, 200],
        tag: options?.tag || `notification-${Date.now()}`,
        renotify: true,
        data: options?.data || '/',
        requireInteraction: false
      })
    );
  }
});

// Service Worker lifecycle
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Generic Push event (covers standard Web Push from webpush.sendNotification and Apple APNs)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: '🔔 뼈반집 알림', body: event.data.text() };
    }
  }

  const title = data.title || data.notification?.title || data.data?.title || '🔔 뼈반집 알림';
  const body = data.body || data.notification?.body || data.data?.body || '새로운 업무/매출 업데이트가 등록되었습니다.';
  
  const options = {
    body: body,
    icon: data.icon || data.notification?.icon || data.data?.icon || 'https://placehold.co/192x192/A8462B/white?text=Ppyeo',
    badge: 'https://placehold.co/192x192/A8462B/white?text=Ppyeo',
    vibrate: [300, 100, 300, 100, 300],
    tag: data.tag || data.data?.tag || `push-${Date.now()}`,
    renotify: true,
    data: data.url || data.data?.url || '/',
    requireInteraction: true
  };

  event.waitUntil(self.registration.showNotification(title, options));
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
