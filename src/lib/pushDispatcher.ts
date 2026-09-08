import { db } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export interface PushNotificationPayload {
  title: string;
  body: string;
  type?: string;
  url?: string;
  tag?: string;
}

/**
 * Sends a real-time Web Push notification to all active devices registered in Firestore `fcm_tokens`.
 * This works directly across browsers without requiring a separate backend worker process,
 * ensuring background/locked-screen delivery via FCM endpoints.
 */
export async function dispatchBackgroundPushToAll(payload: PushNotificationPayload): Promise<{ successCount: number; failureCount: number }> {
  try {
    const tokensSnapshot = await getDocs(collection(db, 'fcm_tokens'));
    if (tokensSnapshot.empty) {
      console.log('[PushDispatcher] No registered device tokens found in Firestore.');
      return { successCount: 0, failureCount: 0 };
    }

    const tokens: Array<{ id: string; token: string }> = [];
    tokensSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data?.token && data?.active !== false) {
        tokens.push({ id: docSnap.id, token: data.token });
      }
    });

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    console.log(`[PushDispatcher] Dispatching push to ${tokens.length} registered device(s)...`);

    let successCount = 0;
    let failureCount = 0;

    // Send push trigger requests
    const promises = tokens.map(async ({ id, token }) => {
      try {
        // FCM HTTP v1 / WebPush trigger via endpoint relay
        const response = await fetch('/api/send-fcm-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            title: payload.title,
            body: payload.body,
            type: payload.type || 'general',
            url: payload.url || '/',
            tag: payload.tag || `push-${Date.now()}`
          })
        });

        if (response.ok) {
          const resData = await response.json().catch(() => ({}));
          if (resData.success) {
            successCount++;
          } else {
            // Server reported invalid token or mismatch
            if (resData.error === 'token-mismatch-or-invalid') {
              console.warn(`[PushDispatcher] Cleaning up expired/mismatched token ${id}`);
              await deleteDoc(doc(db, 'fcm_tokens', id)).catch(() => {});
            }
            failureCount++;
          }
        } else {
          // If server returns token expired / invalid, mark or clean up
          const errData = await response.json().catch(() => ({}));
          if (errData?.error === 'invalid-token' || response.status === 404 || response.status === 410) {
            console.warn(`[PushDispatcher] Cleaning up expired token ${id}`);
            await deleteDoc(doc(db, 'fcm_tokens', id)).catch(() => {});
          }
          failureCount++;
        }
      } catch (err) {
        failureCount++;
        console.warn(`[PushDispatcher] Failed to send push to token ${id}:`, err);
      }
    });

    await Promise.allSettled(promises);
    return { successCount, failureCount };
  } catch (error) {
    console.error('[PushDispatcher] Error during push broadcast:', error);
    return { successCount: 0, failureCount: 0 };
  }
}
