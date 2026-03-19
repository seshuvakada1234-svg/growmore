'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from '@/firebase/config';

/**
 * Initialize Firebase App (only once)
 */
export const app: FirebaseApp =
  !getApps().length ? initializeApp(firebaseConfig) : getApp();

/**
 * Initialize Firestore (SAFE + STABLE for dev environments)
 */
let firestoreInstance: Firestore;

try {
  firestoreInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true, // ✅ fixes network issues
    useFetchStreams: false,             // ✅ required for some environments
    ignoreUndefinedProperties: true,
  });
} catch (e) {
  // Prevent crash during hot reload
  firestoreInstance = getFirestore(app);
}

export const db: Firestore = firestoreInstance;

/**
 * Initialize Storage
 */
export const storage: FirebaseStorage = getStorage(app);

/**
 * Initialize Auth (client-only safe)
 */
export const auth: Auth =
  typeof window !== 'undefined'
    ? getAuth(app)
    : (null as unknown as Auth);

export default app;