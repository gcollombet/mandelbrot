const admin = require('firebase-admin');
const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');
const {
  PERSONAL_PRESET_LIMIT,
  PERSONAL_TEXTURE_LIMIT,
  MAX_TEXTURE_BYTES,
  isAdminClaims,
  quotaCountAfter,
  requireGuid,
  requirePresetType,
  validateTextureMetadata,
} = require('./personalLibraryCore');

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
    res.status(200).json({role: isAdmin ? 'admin' : 'user'});
  } catch {
    res.status(200).json({role: 'guest'});
  }
});

function requireUser(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Authentication is required.');
  return request.auth.uid;
}

async function requireAdmin(request) {
  const uid = requireUser(request);
  if (isAdminClaims(request.auth.token)) return uid;
  const adminDoc = await admin.firestore().doc(`admins/${uid}`).get();
  if (!adminDoc.exists) throw new HttpsError('permission-denied', 'Admin authorization is required.');
  return uid;
}

function translateValidationError(error) {
  if (error instanceof HttpsError) throw error;
  if (error?.code === 'quota-exceeded') {
    throw new HttpsError('resource-exhausted', 'Personal library quota reached.');
  }
  throw new HttpsError('invalid-argument', error?.message || 'Invalid personal library request.');
}

function usageRef(uid) {
  return admin.firestore().doc(`users/${uid}/usage/current`);
}

function presetRef(uid, guid) {
  return admin.firestore().doc(`users/${uid}/presets/${guid}`);
}

function textureRef(uid, guid) {
  return admin.firestore().doc(`users/${uid}/textures/${guid}`);
}

function reservationRef(uid, fileName) {
  return admin.firestore().doc(`users/${uid}/textureReservations/${fileName}`);
}

function textureFileName(guid) {
  return `${guid}.webp`;
}

exports.upsertPersonalPreset = onCall({region: 'europe-west1'}, async (request) => {
  const uid = requireUser(request);
  try {
    const guid = requireGuid(request.data?.record?.guid);
    const type = requirePresetType(request.data?.record?.type);
    const serialized = JSON.stringify(request.data.record);
    if (serialized.length > 900_000) throw new Error('preset-payload-too-large');
    const record = request.data.record;
    return await admin.firestore().runTransaction(async (transaction) => {
      const target = presetRef(uid, guid);
      const usage = usageRef(uid);
      const [targetSnapshot, usageSnapshot] = await Promise.all([
        transaction.get(target),
        transaction.get(usage),
      ]);
      const currentUsage = usageSnapshot.data() || {};
      const presetCount = quotaCountAfter({
        count: currentUsage.presetCount || 0,
        limit: PERSONAL_PRESET_LIMIT,
        exists: targetSnapshot.exists,
        action: 'upsert',
      });
      const revision = (targetSnapshot.data()?.revision || 0) + 1;
      transaction.set(target, {
        ...record,
        guid,
        type,
        ownerUid: uid,
        revision,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.set(usage, {
        presetCount,
        textureCount: currentUsage.textureCount || 0,
        revision: (currentUsage.revision || 0) + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
      return {guid, revision, presetCount};
    });
  } catch (error) {
    return translateValidationError(error);
  }
});

exports.deletePersonalPreset = onCall({region: 'europe-west1'}, async (request) => {
  const uid = requireUser(request);
  try {
    const guid = requireGuid(request.data?.guid);
    return await admin.firestore().runTransaction(async (transaction) => {
      const target = presetRef(uid, guid);
      const usage = usageRef(uid);
      const [targetSnapshot, usageSnapshot] = await Promise.all([
        transaction.get(target),
        transaction.get(usage),
      ]);
      const currentUsage = usageSnapshot.data() || {};
      const presetCount = quotaCountAfter({
        count: currentUsage.presetCount || 0,
        limit: PERSONAL_PRESET_LIMIT,
        exists: targetSnapshot.exists,
        action: 'delete',
      });
      if (targetSnapshot.exists) transaction.delete(target);
      transaction.set(usage, {
        presetCount,
        textureCount: currentUsage.textureCount || 0,
        revision: (currentUsage.revision || 0) + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
      return {guid, deleted: targetSnapshot.exists, presetCount};
    });
  } catch (error) {
    return translateValidationError(error);
  }
});

exports.reservePersonalTexture = onCall({region: 'europe-west1'}, async (request) => {
  const uid = requireUser(request);
  try {
    const guid = requireGuid(request.data?.guid);
    const fileName = textureFileName(guid);
    return await admin.firestore().runTransaction(async (transaction) => {
      const target = textureRef(uid, guid);
      const reservation = reservationRef(uid, fileName);
      const usage = usageRef(uid);
      const [targetSnapshot, reservationSnapshot, usageSnapshot] = await Promise.all([
        transaction.get(target),
        transaction.get(reservation),
        transaction.get(usage),
      ]);
      const currentUsage = usageSnapshot.data() || {};
      const alreadyCounted = targetSnapshot.exists || reservationSnapshot.exists;
      const textureCount = quotaCountAfter({
        count: currentUsage.textureCount || 0,
        limit: PERSONAL_TEXTURE_LIMIT,
        exists: alreadyCounted,
        action: 'upsert',
      });
      const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 60 * 1000);
      transaction.set(reservation, {
        guid,
        ownerUid: uid,
        fileName,
        counted: !alreadyCounted,
        expiresAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.set(usage, {
        presetCount: currentUsage.presetCount || 0,
        textureCount,
        revision: (currentUsage.revision || 0) + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
      return {guid, fileName, storagePath: `users/${uid}/textures/${fileName}`, textureCount, expiresAt: expiresAt.toMillis()};
    });
  } catch (error) {
    return translateValidationError(error);
  }
});

exports.finalizePersonalTexture = onCall({region: 'europe-west1'}, async (request) => {
  const uid = requireUser(request);
  try {
    const metadata = request.data?.metadata;
    const guid = requireGuid(metadata?.guid);
    const dimensions = validateTextureMetadata(metadata);
    const fileName = textureFileName(guid);
    const storagePath = `users/${uid}/textures/${fileName}`;
    const [objectMetadata] = await admin.storage().bucket().file(storagePath).getMetadata();
    const actualSize = Number(objectMetadata.size || 0);
    if (objectMetadata.contentType !== 'image/webp' || actualSize < 1 || actualSize > MAX_TEXTURE_BYTES
      || actualSize !== dimensions.byteSize) {
      throw new Error('uploaded-texture-metadata-mismatch');
    }
    return await admin.firestore().runTransaction(async (transaction) => {
      const target = textureRef(uid, guid);
      const reservation = reservationRef(uid, fileName);
      const [targetSnapshot, reservationSnapshot] = await Promise.all([
        transaction.get(target),
        transaction.get(reservation),
      ]);
      if (!targetSnapshot.exists && !reservationSnapshot.exists) throw new Error('texture-reservation-missing');
      const revision = (targetSnapshot.data()?.revision || 0) + 1;
      transaction.set(target, {
        ...metadata,
        ...dimensions,
        guid,
        ownerUid: uid,
        storagePath,
        contentType: 'image/webp',
        revision,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      if (reservationSnapshot.exists) transaction.delete(reservation);
      return {guid, revision, storagePath};
    });
  } catch (error) {
    return translateValidationError(error);
  }
});

exports.deletePersonalTexture = onCall({region: 'europe-west1'}, async (request) => {
  const uid = requireUser(request);
  try {
    const guid = requireGuid(request.data?.guid);
    const fileName = textureFileName(guid);
    const result = await admin.firestore().runTransaction(async (transaction) => {
      const target = textureRef(uid, guid);
      const reservation = reservationRef(uid, fileName);
      const usage = usageRef(uid);
      const [targetSnapshot, reservationSnapshot, usageSnapshot] = await Promise.all([
        transaction.get(target),
        transaction.get(reservation),
        transaction.get(usage),
      ]);
      const currentUsage = usageSnapshot.data() || {};
      const counted = targetSnapshot.exists || reservationSnapshot.data()?.counted === true;
      const textureCount = quotaCountAfter({
        count: currentUsage.textureCount || 0,
        limit: PERSONAL_TEXTURE_LIMIT,
        exists: counted,
        action: 'delete',
      });
      if (targetSnapshot.exists) transaction.delete(target);
      if (reservationSnapshot.exists) transaction.delete(reservation);
      transaction.set(usage, {
        presetCount: currentUsage.presetCount || 0,
        textureCount,
        revision: (currentUsage.revision || 0) + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
      return {guid, deleted: counted, textureCount};
    });
    await admin.storage().bucket().file(`users/${uid}/textures/${fileName}`).delete({ignoreNotFound: true});
    return result;
  } catch (error) {
    return translateValidationError(error);
  }
});

exports.repairExpiredTextureReservations = onCall({region: 'europe-west1'}, async (request) => {
  const uid = requireUser(request);
  const now = admin.firestore.Timestamp.now();
  const expired = await admin.firestore()
    .collection(`users/${uid}/textureReservations`)
    .where('expiresAt', '<=', now)
    .get();
  let repaired = 0;
  for (const snapshot of expired.docs) {
    const data = snapshot.data();
    const guid = data.guid;
    if (typeof guid !== 'string') continue;
    const released = await admin.firestore().runTransaction(async (transaction) => {
      const reservation = reservationRef(uid, snapshot.id);
      const target = textureRef(uid, guid);
      const usage = usageRef(uid);
      const [reservationSnapshot, targetSnapshot, usageSnapshot] = await Promise.all([
        transaction.get(reservation),
        transaction.get(target),
        transaction.get(usage),
      ]);
      if (!reservationSnapshot.exists || targetSnapshot.exists) {
        if (reservationSnapshot.exists) transaction.delete(reservation);
        return false;
      }
      const reservationData = reservationSnapshot.data();
      const currentUsage = usageSnapshot.data() || {};
      const counted = reservationData.counted === true;
      transaction.delete(reservation);
      if (counted) {
        transaction.set(usage, {
          presetCount: currentUsage.presetCount || 0,
          textureCount: quotaCountAfter({
            count: currentUsage.textureCount || 0,
            limit: PERSONAL_TEXTURE_LIMIT,
            exists: true,
            action: 'delete',
          }),
          revision: (currentUsage.revision || 0) + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
      }
      return counted;
    });
    await admin.storage().bucket().file(`users/${uid}/textures/${snapshot.id}`).delete({ignoreNotFound: true});
    if (released) repaired += 1;
  }
  return {repaired};
});

exports.savePersonalImportBatch = onCall({region: 'europe-west1'}, async (request) => {
  const uid = requireUser(request);
  try {
    const id = requireGuid(request.data?.batch?.id);
    const batch = request.data.batch;
    await admin.firestore().doc(`users/${uid}/importBatches/${id}`).set({
      ...batch,
      id,
      uid,
      ownerUid: uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    return {id};
  } catch (error) {
    return translateValidationError(error);
  }
});

exports.repairPersonalUsage = onCall({region: 'europe-west1'}, async (request) => {
  const uid = await requireAdmin(request);
  const targetUid = typeof request.data?.uid === 'string' && request.data.uid ? request.data.uid : uid;
  const [presets, textures] = await Promise.all([
    admin.firestore().collection(`users/${targetUid}/presets`).get(),
    admin.firestore().collection(`users/${targetUid}/textures`).get(),
  ]);
  await usageRef(targetUid).set({
    presetCount: presets.size,
    textureCount: textures.size,
    revision: admin.firestore.FieldValue.increment(1),
    repairedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, {merge: true});
  return {uid: targetUid, presetCount: presets.size, textureCount: textures.size};
});
