import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { app, db } from './firebase';
import { doc, setDoc, serverTimestamp, collection, getDocs, Timestamp } from 'firebase/firestore';
import { UserAccount } from '../types';

export const FCM_VAPID_KEY = 'BGfczqa3B2WjmUafaaYdYEyrPY238iEPVxkZE_IWfqz8CQuyOk498O_e8A28eW4SSKUnFs_MfKrcao6T82Nkj_Q';

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

// Register Service Worker and acquire FCM device token
export const registerFCMToken = async (user?: UserAccount | null): Promise<string | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    console.warn('[FCM] ServiceWorker or Notification API is missing in browser.');
    return null;
  }

  try {
    // 1. Request Browser Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[FCM] Notification permission was not granted:', permission);
      return null;
    }

    // 2. Register /firebase-messaging-sw.js
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    await navigator.serviceWorker.ready;

    // 3. Initialize Messaging
    const messaging = await getMessagingClient();
    if (!messaging) {
      console.warn('[FCM] Messaging could not be initialized.');
      return null;
    }

    // 4. Retrieve FCM Token with VAPID Key
    const token = await getToken(messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: swRegistration
    });

    if (!token) {
      console.warn('[FCM] No registration token available.');
      return null;
    }

    // 5. Save/Update Token to Firestore `fcm_tokens` collection
    const tokenDocId = token.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-60);
    const tokenRef = doc(db, 'fcm_tokens', tokenDocId);

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    await setDoc(tokenRef, {
      token: token,
      userId: user?.id || user?.username || 'guest',
      userName: user?.name || '사용자',
      userRole: user?.role || '직원',
      platform: isIos ? (isStandalone ? 'iOS-PWA' : 'iOS-Safari') : 'Android-or-Desktop',
      userAgent: navigator.userAgent,
      updatedAt: serverTimestamp(),
      active: true
    }, { merge: true });

    console.log('[FCM] Successfully registered device token to Firestore:', tokenDocId);
    return token;
  } catch (err) {
    console.error('[FCM] Error registering FCM token:', err);
    return null;
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
