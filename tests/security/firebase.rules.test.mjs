import {readFile} from 'node:fs/promises';
import {after, before, beforeEach, describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {Timestamp} from 'firebase/firestore';

const projectId = 'demo-mandelbrot-rules';
let env;
const now = () => Timestamp.now();
const preset = (overrides = {}) => ({
  guid: 'a', type: 'completePreset', payload: {scale: '1'}, name: 'A', favorite: false,
  updatedAt: now(), revision: 1, ownerUid: 'alice', ...overrides,
});
const texture = (overrides = {}) => ({
  guid: 'a', name: 'A', kind: 'texture', contentType: 'image/webp', storagePath: 'users/alice/textures/a.webp',
  width: 2, height: 2, byteSize: 4, thumbnail: '', updatedAt: now(), revision: 1, ownerUid: 'alice', ...overrides,
});
const reservation = (overrides = {}) => ({
  guid: 'a', fileName: 'a.webp', ownerUid: 'alice', counted: true,
  expiresAt: Timestamp.fromMillis(Date.now() + 1_800_000), updatedAt: now(), ...overrides,
});
const owner = () => env.authenticatedContext('alice');
const other = () => env.authenticatedContext('bob');
const guest = () => env.unauthenticatedContext();
const seed = (path, value) => env.withSecurityRulesDisabled(ctx => ctx.firestore().doc(path).set(value));

before(async () => {
  // Refuse to run without emulators; no test may fall back to the production project.
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST);
  env = await initializeTestEnvironment({
    projectId,
    firestore: {host: '127.0.0.1', port: 8185, rules: await readFile('firestore.rules', 'utf8')},
    storage: {host: '127.0.0.1', port: 9295, rules: await readFile('storage.rules', 'utf8')},
  });
});
beforeEach(async () => { await env.clearFirestore(); await env.clearStorage(); });
after(async () => { if (env) await env.cleanup(); });

describe('Firestore authorization', () => {
  for (const [path, data] of [
    ['presets/a', () => preset()], ['textures/a', () => texture()],
    ['manifests/presets', () => ({entries: [], revision: 1, updatedAt: now()})],
    ['usage/current', () => ({presetCount: 0, textureCount: 0, revision: 1, updatedAt: now()})],
    ['textureReservations/a.webp', () => reservation()],
    ['importBatches/a', () => ({id: 'a', uid: 'alice', ownerUid: 'alice', status: 'pending', presetGuids: [], textureGuids: [], completedPresetGuids: [], completedTextureGuids: [], updatedAt: now()})],
  ]) {
    it(`isolates ${path} from guests and other accounts, including admins`, async () => {
      const fullPath = `users/alice/${path}`;
      await assertSucceeds(owner().firestore().doc(fullPath).set(data()));
      await assertSucceeds(owner().firestore().doc(fullPath).get());
      await assertSucceeds(owner().firestore().collection(`users/alice/${path.split('/')[0]}`).get());
      for (const context of [guest(), other(), env.authenticatedContext('admin', {admin: true})]) {
        await assertFails(context.firestore().doc(fullPath).get());
        await assertFails(context.firestore().collection(`users/alice/${path.split('/')[0]}`).get());
        await assertFails(context.firestore().doc(fullPath).set(data()));
        await assertFails(context.firestore().doc(fullPath).delete());
      }
    });
  }

  it('allows public catalog get, but denies enumeration and changes to non-admins', async () => {
    const path = 'catalog/completePreset/entries/a';
    await seed(path, {guid: 'a', name: 'A'});
    await seed('catalogManifest/current', {schemaVersion: 1, entries: [], updatedAt: now()});
    for (const context of [guest(), owner()]) {
      await assertSucceeds(context.firestore().doc(path).get());
      await assertSucceeds(context.firestore().doc('catalogManifest/current').get());
      await assertFails(context.firestore().collection('catalog/completePreset/entries').get());
      await assertFails(context.firestore().doc(path).set({guid: 'a', name: 'Changed'}));
      await assertFails(context.firestore().doc(path).delete());
      await assertFails(context.firestore().doc('catalogManifest/current').set({schemaVersion: 1, entries: [], updatedAt: now()}));
    }
  });

  it('allows catalog publication through a protected admin record or trusted claim', async () => {
    await seed('admins/alice', {});
    for (const context of [owner(), env.authenticatedContext('admin', {admin: true}), env.authenticatedContext('admin-role', {role: 'admin'})]) {
      await assertSucceeds(context.firestore().doc('catalog/completePreset/entries/a').set({guid: 'a', name: 'A'}));
      await assertSucceeds(context.firestore().collection('catalog/completePreset/entries').get());
    }
  });

  it('prevents self-promotion, changes to admin records and unknown paths', async () => {
    await seed('admins/alice', {});
    await assertSucceeds(owner().firestore().doc('admins/alice').get());
    await assertFails(other().firestore().doc('admins/alice').get());
    for (const context of [guest(), owner(), env.authenticatedContext('admin', {admin: true})]) {
      await assertFails(context.firestore().doc('admins/alice').set({admin: true}));
      await assertFails(context.firestore().doc('admins/alice').delete());
      await assertFails(context.firestore().doc('unexpected/a').set({value: true}));
      await assertFails(context.firestore().doc('users/alice/unexpected/a').set({value: true}));
    }
  });
});

describe('Firestore data validation and compatibility', () => {
  it('accepts old texture documents and the new favorite and SHA-256 fields', async () => {
    const target = owner().firestore().doc('users/alice/textures/a');
    await assertSucceeds(target.set(texture()));
    await assertSucceeds(target.update({favorite: true, blobHash: 'a'.repeat(64), revision: 2, updatedAt: now()}));
    assert.equal((await target.get()).data().favorite, true);
    await assertSucceeds(target.update({favorite: false, revision: 3, updatedAt: now()}));
  });

  for (const [label, invalid] of [
    ['foreign owner', {ownerUid: 'bob'}], ['foreign Storage path', {storagePath: 'users/bob/textures/a.webp'}],
    ['GUID mismatch', {guid: 'b'}], ['oversized blob', {byteSize: 5 * 1024 * 1024 + 1}],
    ['oversized width', {width: 1025}], ['zero height', {height: 0}], ['non-WebP type', {contentType: 'image/png'}],
    ['wrong favorite type', {favorite: 'true'}], ['invalid hash', {blobHash: 'not-a-hash'}],
    ['unknown field', {admin: true}], ['invalid initial revision', {revision: 2}],
  ]) {
    it(`rejects texture ${label}`, async () => {
      await assertFails(owner().firestore().doc('users/alice/textures/a').set(texture(invalid)));
    });
  }

  it('rejects stale revisions and invalid preset owners/types', async () => {
    const target = owner().firestore().doc('users/alice/presets/a');
    await assertFails(target.set(preset({ownerUid: 'bob'})));
    await assertFails(target.set(preset({type: 'unknown'})));
    await assertSucceeds(target.set(preset()));
    await assertFails(target.update({name: 'Stale', revision: 1}));
    await assertFails(target.update({name: 'Skipped', revision: 3}));
    await assertSucceeds(target.update({name: 'Updated', revision: 2, updatedAt: now()}));
  });

  it('bounds quota documents and manifests and prevents their deletion', async () => {
    const usage = owner().firestore().doc('users/alice/usage/current');
    await assertFails(usage.set({presetCount: 401, textureCount: 0, revision: 1, updatedAt: now()}));
    await assertFails(usage.set({presetCount: 0, textureCount: 11, revision: 1, updatedAt: now()}));
    await assertSucceeds(usage.set({presetCount: 400, textureCount: 10, revision: 1, updatedAt: now()}));
    await assertFails(usage.delete());
    const manifest = owner().firestore().doc('users/alice/manifests/presets');
    await assertFails(manifest.set({entries: Array(401).fill({guid: 'a', type: 'completePreset', revision: 1}), revision: 1, updatedAt: now()}));
    await assertSucceeds(manifest.set({entries: [], revision: 1, updatedAt: now()}));
    await assertFails(manifest.delete());
  });

  it('documents the existing limitation: client-maintained quotas do not stop direct owner writes', async () => {
    await seed('users/alice/usage/current', {presetCount: 400, textureCount: 10, revision: 1, updatedAt: now()});
    // This is a known anti-abuse gap, not an assertion of quota enforcement.
    await assertSucceeds(owner().firestore().doc('users/alice/presets/a').set(preset()));
    await assertSucceeds(owner().firestore().doc('users/alice/textureReservations/a.webp').set(reservation()));
  });
});

describe('Storage authorization and upload restrictions', () => {
  it('requires a valid unexpired reservation for a private WebP upload', async () => {
    const target = owner().storage().ref('users/alice/textures/a.webp');
    await assertFails(target.put(new Uint8Array(4), {contentType: 'image/webp'}));
    await seed('users/alice/textureReservations/a.webp', reservation({expiresAt: Timestamp.fromMillis(Date.now() - 60000)}));
    await assertFails(target.put(new Uint8Array(4), {contentType: 'image/webp'}));
    await seed('users/alice/textureReservations/a.webp', reservation());
    await assertSucceeds(target.put(new Uint8Array(4), {contentType: 'image/webp', customMetadata: {sha256: 'a'.repeat(64)}}));
    await assertSucceeds(target.getMetadata());
    for (const context of [guest(), other(), env.authenticatedContext('admin', {admin: true})]) {
      const otherTarget = context.storage().ref('users/alice/textures/a.webp');
      await assertFails(otherTarget.getMetadata());
      await assertFails(otherTarget.put(new Uint8Array(4), {contentType: 'image/webp'}));
      await assertFails(otherTarget.delete());
    }
    await assertSucceeds(target.delete());
  });

  it('rejects wrong MIME, filenames, unknown paths and files larger than 5 MiB', async () => {
    await seed('users/alice/textureReservations/a.webp', reservation());
    const target = owner().storage().ref('users/alice/textures/a.webp');
    await assertFails(target.put(new Uint8Array(4), {contentType: 'image/png'}));
    await assertFails(target.put(new Uint8Array(5 * 1024 * 1024 + 1), {contentType: 'image/webp'}));
    await assertFails(owner().storage().ref('users/alice/textures/a.png').put(new Uint8Array(4), {contentType: 'image/webp'}));
    await assertFails(owner().storage().ref('unexpected/a').put(new Uint8Array(4), {contentType: 'image/webp'}));
  });

  it('keeps public textures readable and reserves their publication to admins', async () => {
    await seed('admins/alice', {});
    const path = 'catalog/texture/a';
    await assertSucceeds(owner().storage().ref(path).put(new Uint8Array(4), {contentType: 'image/webp'}));
    await assertSucceeds(guest().storage().ref(path).getMetadata());
    await assertFails(other().storage().ref(path).put(new Uint8Array(4), {contentType: 'image/webp'}));
    await assertFails(other().storage().ref(path).delete());
  });
});
