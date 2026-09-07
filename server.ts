import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import firebaseConfig from './firebase-applet-config.json';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Relay FCM Web Push API
  // This endpoint dispatches web push messages to target FCM tokens using Google's FCM messaging service
  app.post('/api/send-fcm-push', async (req, res) => {
    try {
      const { token, title, body, type, url, tag } = req.body;
      if (!token || !title) {
        return res.status(400).json({ error: 'Missing required parameters (token, title)' });
      }

      const fcmPayload = {
        to: token,
        priority: 'high',
        notification: {
          title: title,
          body: body || '',
          icon: 'https://placehold.co/192x192/A8462B/white?text=Ppyeo',
          badge: 'https://placehold.co/192x192/A8462B/white?text=Ppyeo',
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

      // Send to FCM Legacy/HTTP endpoint with API key
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
        return res.json({ success: true, result: responseData });
      } else {
        console.warn('[Server] FCM Push dispatch result:', responseData);
        return res.status(200).json({ success: true, warning: responseData });
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
