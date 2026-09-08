import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import webpush from 'web-push';
import firebaseConfig from './firebase-applet-config.json';
import { serviceAccount as bundledServiceAccount } from './src/lib/serviceAccount';

// VAPID keys for direct W3C standard Web Push (Apple APNs & Google Push Service)
export const SERVER_VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BHJ5lK7wj84lNsbD8d4Qxk5jOsHVb3u-8OBgABmiW_4dlrAbnE7LzscuxyIJy7F4YNT-LbhE2qyYoo4QiJFeg7U';
export const SERVER_VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'aPM2Wl4gxVrBpl0LD2GDHx_z5HgjBZ07O-hFXKxw3ao';

try {
  webpush.setVapidDetails(
    'mailto:kinach7007@gmail.com',
    SERVER_VAPID_PUBLIC_KEY,
    SERVER_VAPID_PRIVATE_KEY
  );
  console.log('✅ [Server] Web-Push VAPID configured successfully');
} catch (e: any) {
  console.warn('⚠️ [Server] Failed to configure webpush VAPID:', e?.message);
}

// Initialize Firebase Admin SDK lazily/safely
let adminApp: App | null = null;
let adminInitialized = false;

function getFirebaseAdminApp() {
  if (adminInitialized && adminApp) return adminApp;
  try {
    let serviceAccount: any = null;
    const rawSecret = process.env.FIREBASE_SERVICE_ACCOUNT;
    console.log('[Server] Checking FIREBASE_SERVICE_ACCOUNT env, length:', rawSecret?.length || 0);
    
    if (rawSecret && rawSecret.trim()) {
      try {
        serviceAccount = JSON.parse(rawSecret);
      } catch (parseErr) {
        // In case the JSON was base64 encoded or has escaped newlines
        const decoded = Buffer.from(rawSecret, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      }
    } else {
      console.log('[Server] Using bundledServiceAccount');
      serviceAccount = bundledServiceAccount;
    }

    if (serviceAccount) {
      console.log('[Server] serviceAccount loaded, project_id:', serviceAccount.project_id);
      if (getApps().length === 0) {
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || firebaseConfig.projectId
        });
      } else {
        adminApp = getApps()[0];
      }
      adminInitialized = true;
      console.log('✅ [Server] Firebase Admin SDK initialized successfully with Service Account');
    } else {
      console.log('ℹ️ [Server] FIREBASE_SERVICE_ACCOUNT not found, falling back to Web FCM Relay');
    }
  } catch (error: any) {
    console.error('⚠️ [Server] Error initializing Firebase Admin SDK:', error?.message || error, error?.stack);
  }
  return adminApp;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Global CORS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check & Service Account status
  app.get('/api/health', (req, res) => {
    getFirebaseAdminApp();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      adminPushReady: adminInitialized,
      webPushReady: true
    });
  });

  // Return server VAPID Public Key for native Web Push registration
  app.get('/api/vapid-public-key', (req, res) => {
    res.json({ publicKey: SERVER_VAPID_PUBLIC_KEY });
  });

  // Direct W3C standard Web Push endpoint
  // Works natively for Apple APNs (iOS Safari / PWA) and Google Chrome (Android / Desktop)
  app.post('/api/send-web-push', async (req, res) => {
    try {
      const { subscription, title, body, url, tag } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Missing push subscription object' });
      }

      const payload = JSON.stringify({
        title: title || '🔔 뼈반집 알림',
        body: body || '새로운 업무/매출 보고가 등록되었습니다.',
        url: url || '/',
        tag: tag || `webpush-${Date.now()}`
      });

      console.log('[Server] Dispatching webpush to endpoint:', subscription.endpoint.slice(0, 45) + '...');
      const pushRes = await webpush.sendNotification(subscription, payload, {
        urgency: 'high',
        TTL: 86400
      });

      console.log('[Server] ✅ Web Push sent successfully! Status code:', pushRes.statusCode);
      return res.json({ success: true, statusCode: pushRes.statusCode, mode: 'w3c-webpush' });
    } catch (err: any) {
      console.warn('[Server] ⚠️ Web Push delivery error:', err?.statusCode, err?.message);
      const isExpired = err?.statusCode === 404 || err?.statusCode === 410;
      return res.status(err?.statusCode && err?.statusCode < 500 ? 200 : 500).json({
        success: false,
        error: isExpired ? 'subscription-expired' : (err?.message || 'Failed to dispatch push'),
        statusCode: err?.statusCode
      });
    }
  });

  // Relay FCM Web Push API
  // Dispatches web push messages to target FCM tokens using Google's official FCM v1 / Admin SDK
  app.post('/api/send-fcm-push', async (req, res) => {
    try {
      const { token, title, body, type, url, tag } = req.body;
      if (!token || !title) {
        return res.status(400).json({ error: 'Missing required parameters (token, title)' });
      }

      const adminInstance = getFirebaseAdminApp();

      // If Firebase Admin SDK is initialized, use the official Admin messaging (FCM v1)
      if (adminInitialized && adminInstance) {
        try {
          const message: Message = {
            token: token,
            data: {
              title: String(title),
              body: String(body || ''),
              type: String(type || 'general'),
              url: String(url || '/'),
              tag: String(tag || `push-${Date.now()}`)
            },
            webpush: {
              notification: {
                title: String(title),
                body: String(body || ''),
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: String(tag || `push-${Date.now()}`)
              },
              headers: {
                Urgency: 'high'
              },
              fcmOptions: {
                link: String(url || '/')
              }
            }
          };

          const adminResponse = await getMessaging(adminInstance).send(message);
          console.log('[Server] FCM Admin v1 push sent successfully:', adminResponse);
          return res.json({ success: true, messageId: adminResponse, mode: 'admin-fcm-v1' });
        } catch (adminErr: any) {
          console.warn('[Server] FCM Admin SDK send failed for token:', adminErr?.message || adminErr);
          // If token is invalid, expired, or was created with a previous mismatched project
          return res.status(200).json({ 
            success: false, 
            error: 'token-mismatch-or-invalid', 
            details: adminErr?.message,
            hint: '이전 테스트 토큰이거나 등록되지 않은 토큰입니다. [이 기기 푸시 토큰 즉시 등록/갱신] 버튼을 눌러 새로고침 해주세요.' 
          });
        }
      }

      // Fallback: Send to FCM Legacy/HTTP endpoint with API key
      const fcmPayload = {
        to: token,
        priority: 'high',
        notification: {
          title: title,
          body: body || '',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          click_action: url || '/',
          tag: tag || `push-${Date.now()}`
        },
        data: {
          title: title,
          body: body || '',
          type: type || 'general',
          url: url || '/',
          tag: tag || `push-${Date.now()}`
        }
      };

      const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${firebaseConfig.apiKey}`
        },
        body: JSON.stringify(fcmPayload)
      });

      const responseData = await fcmResponse.json().catch(() => ({}));
      
      if (fcmResponse.ok && responseData?.success === 1) {
        return res.json({ success: true, result: responseData, mode: 'legacy-key' });
      } else {
        console.warn('[Server] FCM Push dispatch result:', responseData);
        return res.status(200).json({ success: true, warning: responseData, mode: 'legacy-key' });
      }
    } catch (error: any) {
      console.error('[Server] Error sending FCM push:', error);
      return res.status(500).json({ error: error?.message || 'Failed to dispatch push' });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`뼈반집 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
