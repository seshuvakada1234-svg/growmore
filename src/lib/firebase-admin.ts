import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

/**
 * Initializes the Firebase Admin SDK.
 * It uses the service account key from environment variables if available,
 * otherwise falls back to default credentials (useful for GCP/Firebase App Hosting).
 */
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) 
  : undefined;

if (!getApps().length) {
  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Default initialization for production environments
    initializeApp();
  }
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();
