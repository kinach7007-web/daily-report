import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase Admin SDK lazily/safely
let adminApp: App | null = null;
let adminInitialized = false;

function getFirebaseAdminApp() {
  if (adminInitialized && adminApp) return adminApp;
  try {
    let serviceAccount: any = null;
    const rawSecret = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (rawSecret && rawSecret.trim()) {
      try {
        serviceAccount = JSON.parse(rawSecret);
      } catch (parseErr) {
        // In case the JSON was base64 encoded or has escaped newlines
        const decoded = Buffer.from(rawSecret, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      }
    } else {
      // Check for service-account.json in workspace
      const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
      if (fs.existsSync(serviceAccountPath)) {
        const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
        serviceAccount = JSON.parse(fileContent);
      }
    }

    if (serviceAccount) {
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
  } catch (error) {
    console.error('⚠️ [Server] Error initializing Firebase Admin SDK:', error);
  }
  return adminApp;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check & Service Account status
  app.get('/api/health', (req, res) => {
    getFirebaseAdminApp();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      adminPushReady: adminInitialized
    });
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
            notification: {
              title: String(title),
              body: String(body || '')
            },
            data: {
              title: String(title),
              body: String(body || ''),
              type: String(type || 'general'),
              url: String(url || '/'),
              tag: String(tag || `push-${Date.now()}`)
            },
            webpush: {
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
