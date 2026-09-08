import webpush from 'web-push';

const SERVER_VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BHJ5lK7wj84lNsbD8d4Qxk5jOsHVb3u-8OBgABmiW_4dlrAbnE7LzscuxyIJy7F4YNT-LbhE2qyYoo4QiJFeg7U';
const SERVER_VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'aPM2Wl4gxVrBpl0LD2GDHx_z5HgjBZ07O-hFXKxw3ao';

try {
  webpush.setVapidDetails(
    'mailto:kinach7007@gmail.com',
    SERVER_VAPID_PUBLIC_KEY,
    SERVER_VAPID_PRIVATE_KEY
  );
} catch (e) {
  console.warn('[Vercel API] Web-push VAPID init error:', e);
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { subscription, title, body: contentBody, url, tag } = body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Missing push subscription object' });
    }

    const payload = JSON.stringify({
      title: title || '🔔 뼈반집 알림',
      body: contentBody || '새로운 업무/매출 보고가 등록되었습니다.',
      url: url || '/',
      tag: tag || `webpush-${Date.now()}`
    });

    const pushRes = await webpush.sendNotification(subscription, payload, {
      urgency: 'high',
      TTL: 86400
    });

    return res.status(200).json({ success: true, statusCode: pushRes.statusCode, mode: 'vercel-serverless-webpush' });
  } catch (err) {
    const isExpired = err?.statusCode === 404 || err?.statusCode === 410;
    return res.status(err?.statusCode && err?.statusCode < 500 ? 200 : 500).json({
      success: false,
      error: isExpired ? 'subscription-expired' : (err?.message || 'Failed to dispatch push'),
      statusCode: err?.statusCode
    });
  }
}
