const admin = require('firebase-admin');
const {onRequest} = require('firebase-functions/v2/https');

admin.initializeApp();

const allowedOriginList = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://gcollombet.github.io',
];
const allowedOrigins = new Set(allowedOriginList);

function applyCors(req, res) {
  const origin = req.get('origin');
  if (origin && allowedOrigins.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
}

exports.role = onRequest({region: 'europe-west1', cors: allowedOriginList}, async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({role: 'guest'});
    return;
  }

  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(200).json({role: 'guest'});
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    const adminDoc = await admin.firestore().doc(`admins/${decoded.uid}`).get();
    const isAdmin = decoded.admin === true || decoded.role === 'admin' || adminDoc.exists;
    res.status(200).json({role: isAdmin ? 'admin' : 'guest'});
  } catch {
    res.status(200).json({role: 'guest'});
  }
});
