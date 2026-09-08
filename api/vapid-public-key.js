const SERVER_VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BHJ5lK7wj84lNsbD8d4Qxk5jOsHVb3u-8OBgABmiW_4dlrAbnE7LzscuxyIJy7F4YNT-LbhE2qyYoo4QiJFeg7U';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ publicKey: SERVER_VAPID_PUBLIC_KEY });
}
