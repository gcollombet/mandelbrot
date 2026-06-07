import {GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User} from 'firebase/auth';
import {doc, getDoc} from 'firebase/firestore';
import {getFirebaseServices, isFirebaseConfigured} from './firebaseConfig';

export type UserRole = 'guest' | 'admin';

export interface AuthState {
  user: User | null;
  role: UserRole;
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'guest' || value === 'admin';
}

export function isAuthConfigured(): boolean {
  return isFirebaseConfigured();
}

export async function signInWithGoogle(): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await signInWithPopup(services.auth, new GoogleAuthProvider());
}

export async function signOutCurrentUser(): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await signOut(services.auth);
}

export async function resolveUserRole(user: User | null): Promise<UserRole> {
  if (!user) return 'guest';

  const services = getFirebaseServices();
  if (!services) return 'guest';

  if (!import.meta.env.VITE_FIREBASE_ROLE_ENDPOINT) {
    return resolveFirestoreAdminRole(user.uid);
  }

  try {
    const token = await user.getIdToken();
    const response = await fetch(import.meta.env.VITE_FIREBASE_ROLE_ENDPOINT, {
      headers: {Authorization: `Bearer ${token}`},
    });
    if (!response.ok) return resolveFirestoreAdminRole(user.uid);
    const payload = await response.json() as {role?: unknown};
    return isUserRole(payload.role) ? payload.role : resolveFirestoreAdminRole(user.uid);
  } catch {
    return resolveFirestoreAdminRole(user.uid);
  }
}

async function resolveFirestoreAdminRole(uid: string): Promise<UserRole> {
  const services = getFirebaseServices();
  if (!services) return 'guest';
  try {
    const snapshot = await getDoc(doc(services.db, 'admins', uid));
    return snapshot.exists() ? 'admin' : 'guest';
  } catch {
    return 'guest';
  }
}

export function observeAuthState(callback: (state: AuthState) => void): () => void {
  const services = getFirebaseServices();
  if (!services) {
    callback({user: null, role: 'guest'});
    return () => {};
  }
  return onAuthStateChanged(services.auth, async (user) => {
    callback({user, role: user ? await resolveUserRole(user) : 'guest'});
  });
}
