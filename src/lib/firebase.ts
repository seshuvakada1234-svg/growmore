'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from '@/firebase/config';

/**
 * Initialize Firebase App (singleton)
 */
export const app: FirebaseApp =
  !getApps().length ? initializeApp(firebaseConfig) : getApp();

/**
 * Firestore Singleton (VERY IMPORTANT FIX)
 */
let firestoreInstance: Firestore | null = null;

export function getDB(): Firestore {
  if (firestoreInstance) return firestoreInstance;

  try {
    firestoreInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      useFetchStreams: false,
      ignoreUndefinedProperties: true,
    });
    console.log("[Firebase] Firestore initialized (custom)");
  } catch (e) {
    firestoreInstance = getFirestore(app);
    console.log("[Firebase] Firestore fallback used");
  }

  return firestoreInstance;
}

// ✅ Export single instance
export const db: Firestore = getDB();

/**
 * Storage
 */
export const storage: FirebaseStorage = getStorage(app);

/**
 * Auth (client-safe)
 */
export const auth: Auth =
  typeof window !== 'undefined'
    ? getAuth(app)
    : (null as unknown as Auth);

export default app;