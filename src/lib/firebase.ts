'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from '@/firebase/config';

/**
 * Ensures Firebase is initialized only once.
 * Auth is strictly initialized on the client side to avoid SSR assertion errors.
 */
export const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/**
 * Initialize Firestore with connectivity settings optimized for proxy/restricted environments.
 * We force long polling and disable fetch streams to ensure a stable connection in the Studio environment.
 */
let firestoreInstance: Firestore;

try {
  firestoreInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: true,
    useFetchStreams: false, // Disabling fetch streams improves stability in certain proxy environments
    ignoreUndefinedProperties: true,
  });
} catch (e) {
  // If initializeFirestore was already called, getFirestore returns the existing instance
  firestoreInstance = getFirestore(app);
}

export const db: Firestore = firestoreInstance;

/**
 * Initialize Storage with the explicit bucket from config.
 */
export const storage: FirebaseStorage = getStorage(app);

// Auth instance - initialized once on client
export const auth: Auth = typeof window !== 'undefined' ? getAuth(app) : (null as unknown as Auth);

export default app;
