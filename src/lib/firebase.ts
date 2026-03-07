'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase only once
// We use a singleton pattern to prevent multiple initializations in Next.js development environment
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export initialized singletons for use in services and hooks
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
