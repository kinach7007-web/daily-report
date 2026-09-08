import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { app, db } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserAccount } from '../types';

// VAPID Public Key matching the server's VAPID key pair
export const FCM_VAPID_KEY = 'BHJ5lK7wj84lNsbD8d4Qxk5jOsHVb3u-8OBgABmiW_4dlrAbnE7LzscuxyIJy7F4YNT-LbhE2qyYoo4QiJFeg7U';

// Utility to convert base64url VAPID key to Uint8Array for PushManager
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

let messagingInstance: Messaging | null = null;

// Initialize Firebase Messaging if supported by browser/environment
export const getMessagingClient = async (): Promise<Messaging | null> => {
  if (typeof window === 'undefined') return null;
  if (messagingInstance) return messagingInstance;

  try {
    const supported = await isSupported();
    if (supported) {
      messagingInstance = getMessaging(app);
      return messagingInstance;
    }
  } catch (err) {
    console.warn('[FCM] Firebase Messaging is not supported in this environment:', err);
  }
  return null;
};

// Register Service Worker and acquire Push Subscription / FCM device token
export const registerFCMToken = async (user?: UserAccount | null): Promise<{ token: string | null; subscription?: any; error?: string }> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    console.warn('[FCM] ServiceWorker or Notification API is missing in browser.');
    return { token: null, error: '이 브라우저는 서비스워커 또는 웹 푸시 알림을 지원하지 않습니다.' };
  }

  try {
    // 1. Request Browser Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[FCM] Notification permission was not granted:', permission);
      return { token: null, error: `알림 권한이 허용되지 않았습니다 (${permission}). 브라우저 또는 기기 설정에서 알림을 허용해주세요.` };
    }

    // 2. Register /firebase-messaging-sw.js
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    await navigator.serviceWorker.ready;

    // 3. Acquire fresh native W3C Push Subscription using server VAPID key
    const convertedVapidKey = urlBase64ToUint8Array(FCM_VAPID_KEY);
    let pushSubscription = await swRegistration.pushManager.getSubscription();

    // If an existing subscription was registered with an older/different VAPID key,
    // we must unsubscribe it first, otherwise Apple APNs throws "VapidPkHashMismatch"
    if (pushSubscription) {
      try {
        console.log('[FCM] Refreshing existing subscription to ensure VAPID key consistency...');
        await pushSubscription.unsubscribe();
      } catch (unsubErr) {
        console.warn('[FCM] Non-blocking error during unsubscribe:', unsubErr);
      }
    }

    pushSubscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    const subJson = pushSubscription ? pushSubscription.toJSON() : null;

    // 4. Optionally also get Firebase FCM token
    let fcmToken: string | null = null;
    try {
      const messaging = await getMessagingClient();
      if (messaging) {
        fcmToken = await getToken(messaging, {
          serviceWorkerRegistration: swRegistration
        }).catch(() => null);
      }
    } catch {
      // FCM token optional when native subscription is available
    }

    // 5. Save/Update to Firestore `fcm_tokens`
    // Use endpoint hash or token ID
    const docIdSource = pushSubscription?.endpoint || fcmToken || `device_${Date.now()}`;
    const tokenDocId = docIdSource.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-60);
    const tokenRef = doc(db, 'fcm_tokens', tokenDocId);

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const isAndroid = /Android/.test(navigator.userAgent);

    let platformLabel = 'Desktop (PC/Mac)';
    if (isIos) {
      platformLabel = isStandalone ? '📱 iPhone (홈화면 앱)' : '⚠️ iPhone (사파리 브라우저)';
    } else if (isAndroid) {
      platformLabel = isStandalone ? '📱 Android (홈화면 앱)' : '📱 Android (크롬 모바일)';
    }

    await setDoc(tokenRef, {
      subscription: subJson,
      endpoint: pushSubscription?.endpoint || '',
      token: fcmToken || (subJson ? JSON.stringify(subJson) : ''),
      userId: user?.id || user?.username || 'guest',
      userName: user?.name || '대표 운영자',
      userRole: user?.role || '총괄 운영자',
      platform: platformLabel,
      userAgent: navigator.userAgent,
      updatedAt: serverTimestamp(),
      active: true
    }, { merge: true });

    console.log('[FCM] Successfully registered device subscription to Firestore:', tokenDocId);
    return { token: fcmToken || JSON.stringify(subJson), subscription: subJson };
  } catch (err: any) {
    console.error('[FCM] Error registering push token/subscription:', err);
    return { token: null, error: err?.message || String(err) };
  }
};

// Listen to Foreground FCM Messages
export const subscribeForegroundMessages = async (
  onMessageReceived: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void
): Promise<(() => void) | null> => {
  const messaging = await getMessagingClient();
  if (!messaging) return null;

  try {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message received:', payload);
      onMessageReceived({
        title: payload.notification?.title || payload.data?.title,
        body: payload.notification?.body || payload.data?.body,
        data: payload.data
      });
    });
    return unsubscribe;
  } catch (err) {
    console.warn('[FCM] Failed to subscribe to foreground messages:', err);
    return null;
  }
};
