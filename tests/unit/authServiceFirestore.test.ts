import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({getDoc: vi.fn()}));

vi.mock('../../src/firebaseConfig', () => ({
  isFirebaseConfigured: () => true,
  getFirebaseServices: () => ({db: {kind: 'db'}}),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, ...segments) => ({path: segments.join('/')})),
  getDoc: mocks.getDoc,
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {},
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

import {resolveUserRole} from '../../src/authService';

describe('Firestore role resolution', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves admin from the owner-readable marker without fetching an HTTP endpoint', async () => {
    mocks.getDoc.mockResolvedValue({exists: () => true});
    const user = {uid: 'alice'} as any;
    await expect(resolveUserRole(user)).resolves.toBe('admin');
    expect(mocks.getDoc.mock.calls[0][0].path).toBe('admins/alice');
  });

  it('fails closed to user when the marker is absent or unreadable', async () => {
    const user = {uid: 'alice'} as any;
    mocks.getDoc.mockResolvedValueOnce({exists: () => false});
    await expect(resolveUserRole(user)).resolves.toBe('user');
    mocks.getDoc.mockRejectedValueOnce(new Error('offline'));
    await expect(resolveUserRole(user)).resolves.toBe('user');
  });
});
