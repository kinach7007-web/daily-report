import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { serviceAccount as bundledServiceAccount } from '../src/lib/serviceAccount.js';

let adminApp = null;
function getAdmin() {
  if (adminApp) return adminApp;
  try {
    if (getApps().length === 0) {
      adminApp = initializeApp({
        credential: cert(bundledServiceAccount),
        projectId: bundledServiceAccount.project_id
      });
    } else {
      adminApp = getApps()[0];
    }
  } catch (e) {
    console.warn('[Vercel FCM] Admin SDK init error:', e);
  }
  return adminApp;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { token, title, body: contentBody, url, tag } = body;
    if (!token) return res.status(400).json({ error: 'Missing device token' });

    getAdmin();
    const messaging = getMessaging();
    const response = await messaging.send({
      token,
      notification: {
        title: title || '🔔 뼈반집 알림',
        body: contentBody || '새로운 업무/매출 보고가 등록되었습니다.'
      },
      webpush: {
        fcmOptions: { link: url || '/' },
        notification: {
          tag: tag || `push-${Date.now()}`,
          requireInteraction: true
        }
      }
    });

    return res.status(200).json({ success: true, messageId: response });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
}
