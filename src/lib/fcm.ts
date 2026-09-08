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

// Pre-register Service Worker to guarantee instant pushManager readiness
export const ensureServiceWorkerRegistered = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('[FCM] SW pre-registration warning:', err);
    return null;
  }
};

// Register Service Worker and acquire Push Subscription / FCM device token
export const registerFCMToken = async (
  user?: UserAccount | null
): Promise<{ success: boolean; token: string | null; subscription?: any; error?: string }> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    console.warn('[FCM] ServiceWorker or Notification API is missing in browser.');
    return { success: false, token: null, error: '이 기기나 브라우저는 웹 푸시 알림을 지원하지 않습니다.' };
  }

  try {
    // 1. Request Browser Notification Permission (Immediate)
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      console.log('[FCM] Notification permission was not granted:', permission);
      return { 
        success: false, 
        token: null, 
        error: `알림 권한이 허용되지 않았습니다 (${permission}). 기기 설정이나 브라우저에서 알림을 [허용]으로 변경해주세요.` 
      };
    }

    // 2. Service Worker Registration - Instant check
    let swRegistration: ServiceWorkerRegistration;
    try {
      swRegistration = await navigator.serviceWorker.ready;
    } catch {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
    }

    if (!swRegistration || !swRegistration.pushManager) {
      return { 
        success: false, 
        token: null, 
        error: '푸시 관리자를 초기화할 수 없습니다. 아이폰(iOS)의 경우 사파리 하단 공유 [↑] 버튼 > [홈 화면에 추가] 후 실행해 주세요.' 
      };
    }

    // 3. Directly acquire or reuse native W3C Push Subscription
    const convertedVapidKey = urlBase64ToUint8Array(FCM_VAPID_KEY);
    let pushSubscription = await swRegistration.pushManager.getSubscription();

    if (!pushSubscription) {
      // Direct subscribe without any intermediate unsubscription delay to preserve iOS user gesture
      try {
        pushSubscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      } catch (subErr: any) {
        console.warn('[FCM] PushManager subscribe error, retrying cleanly:', subErr);
        // Clean retry if needed
        const existing = await swRegistration.pushManager.getSubscription();
        if (existing) {
          await existing.unsubscribe().catch(() => {});
        }
        pushSubscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }
    }

    const subJson = pushSubscription ? pushSubscription.toJSON() : null;
    const endpoint = pushSubscription?.endpoint || '';

    if (!endpoint) {
      return {
        success: false,
        token: null,
        error: '푸시 서버 수신 주소(Endpoint) 생성에 실패했습니다. 네트워크 상태를 확인해주세요.'
      };
    }

    // 4. Optionally acquire Firebase FCM token
    let fcmToken: string | null = null;
    try {
      const messaging = await getMessagingClient();
      if (messaging) {
        fcmToken = await getToken(messaging, {
          serviceWorkerRegistration: swRegistration
        }).catch(() => null);
      }
    } catch {
      // FCM token optional when native W3C subscription is available
    }

    // 5. Save/Update to Firestore `fcm_tokens`
    const docIdSource = endpoint || fcmToken || `device_${Date.now()}`;
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
      endpoint: endpoint,
      token: fcmToken || (subJson ? JSON.stringify(subJson) : ''),
      userId: user?.id || user?.username || 'guest',
      userName: user?.name || '대표 운영자',
      userRole: user?.role || '총괄 운영자',
      platform: platformLabel,
      userAgent: navigator.userAgent,
      updatedAt: serverTimestamp(),
      active: true
    }, { merge: true });

    console.log('[FCM] Successfully registered device subscription to Firestore:', tokenDocId, 'User:', user?.name);
    return { 
      success: true, 
      token: fcmToken || JSON.stringify(subJson), 
      subscription: subJson 
    };
  } catch (err: any) {
    console.error('[FCM] Error registering push token/subscription:', err);
    return { 
      success: false, 
      token: null, 
      error: err?.message || String(err) 
    };
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
