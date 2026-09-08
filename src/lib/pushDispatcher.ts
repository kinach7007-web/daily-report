import { db } from './firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

export interface PushNotificationPayload {
  title: string;
  body: string;
  type?: string;
  url?: string;
  tag?: string;
}

/**
 * Sends a real-time Web Push notification to all active devices registered in Firestore `fcm_tokens`.
 * Uses direct W3C standard Web Push (/api/send-web-push) for Apple APNs & Google Push Service,
 * and FCM Admin SDK (/api/send-fcm-push) as a robust secondary channel.
 */
export async function dispatchBackgroundPushToAll(payload: PushNotificationPayload): Promise<{ successCount: number; failureCount: number }> {
  try {
    const tokensSnapshot = await getDocs(collection(db, 'fcm_tokens'));
    if (tokensSnapshot.empty) {
      console.log('[PushDispatcher] No registered device tokens found in Firestore.');
      return { successCount: 0, failureCount: 0 };
    }

    interface RegisteredDevice {
      id: string;
      token?: string;
      subscription?: any;
      platform?: string;
      userName?: string;
    }

    const devices: RegisteredDevice[] = [];
    tokensSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if ((data?.subscription || data?.token) && data?.active !== false) {
        devices.push({
          id: docSnap.id,
          token: data.token,
          subscription: data.subscription,
          platform: data.platform,
          userName: data.userName
        });
      }
    });

    if (devices.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    console.log(`[PushDispatcher] Dispatching push to ${devices.length} registered device(s)...`);

    let successCount = 0;
    let failureCount = 0;

    const promises = devices.map(async (device) => {
      let delivered = false;

      // 1. Primary: Direct W3C Web Push (Works for Apple iOS PWA & Google Android/Chrome)
      if (device.subscription && device.subscription.endpoint) {
        try {
          const wpRes = await fetch('/api/send-web-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscription: device.subscription,
              title: payload.title,
              body: payload.body,
              url: payload.url || '/',
              tag: payload.tag || `push-${Date.now()}`
            })
          });

          if (wpRes.ok) {
            const wpData = await wpRes.json().catch(() => ({}));
            if (wpData.success) {
              console.log(`[PushDispatcher] Delivered via Web-Push to ${device.userName || device.id} (${device.platform})`);
              delivered = true;
            } else if (wpData.error === 'subscription-expired' || wpData.statusCode === 410 || wpData.statusCode === 404) {
              console.warn(`[PushDispatcher] Subscription expired for ${device.id}, cleaning up`);
              await deleteDoc(doc(db, 'fcm_tokens', device.id)).catch(() => {});
            }
          }
        } catch (wpErr) {
          console.warn(`[PushDispatcher] Web-Push attempt failed for ${device.id}:`, wpErr);
        }
      }

      // 2. Secondary: If not delivered and has FCM token string, attempt /api/send-fcm-push
      if (!delivered && device.token && typeof device.token === 'string' && !device.token.startsWith('{')) {
        try {
          const fcmRes = await fetch('/api/send-fcm-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: device.token,
              title: payload.title,
              body: payload.body,
              type: payload.type || 'general',
              url: payload.url || '/',
              tag: payload.tag || `push-${Date.now()}`
            })
          });

          if (fcmRes.ok) {
            const fcmData = await fcmRes.json().catch(() => ({}));
            if (fcmData.success) {
              console.log(`[PushDispatcher] Delivered via FCM to ${device.userName || device.id}`);
              delivered = true;
            }
          }
        } catch (fcmErr) {
          console.warn(`[PushDispatcher] FCM attempt failed for ${device.id}:`, fcmErr);
        }
      }

      if (delivered) {
        successCount++;
      } else {
        failureCount++;
      }
    });

    await Promise.allSettled(promises);
    return { successCount, failureCount };
  } catch (error) {
    console.error('[PushDispatcher] Error during push broadcast:', error);
    return { successCount: 0, failureCount: 0 };
  }
}
