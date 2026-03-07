'use client';

import { app, auth, db, storage } from '@/lib/firebase';

/**
 * Re-exports initialized services to maintain compatibility with 
 * existing FirebaseClientProvider and hooks.
 */
export function initializeFirebase() {
  return {
    firebaseApp: app,
    auth: auth,
    firestore: db,
    storage: storage
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
