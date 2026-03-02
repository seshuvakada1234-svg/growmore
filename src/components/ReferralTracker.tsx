
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, collection, addDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

/**
 * A silent client-side component that captures the 'ref' parameter from the URL,
 * stores it in localStorage, and records a click log in Firestore for tracking.
 */
export function ReferralTracker() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const db = useFirestore();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (!ref || !db) return;

    // 1. Storage: Standardize key to 'affiliate_ref'
    localStorage.setItem('affiliate_ref', ref);
    console.log('Affiliate referral captured:', ref);

    // 2. Anti-Fraud & Logic
    const handleTracking = async () => {
      // Rule: Do NOT count click if user is logged in AND uid == affiliateId
      if (user?.uid === ref) {
        console.log('Self-click detected. Skipping log.');
        return;
      }

      // Rule: Do NOT count multiple clicks from same browser within 24 hours
      const lastClickKey = `last_click_${ref}`;
      const lastClickTime = localStorage.getItem(lastClickKey);
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (lastClickTime && now - parseInt(lastClickTime) < twentyFourHours) {
        console.log('Click already recorded within 24h. Skipping Firestore write.');
        return;
      }

      try {
        // 3. Log the click record (Silent)
        const clickRef = collection(db, 'affiliateClicks');
        addDoc(clickRef, {
          affiliateId: ref,
          userAgent: navigator.userAgent,
          createdAt: serverTimestamp(),
          authenticatedUserId: user?.uid || null
        });

        // 4. Increment totalClicks on the affiliate's user profile (Public Increment Rule)
        // We use the root user document as that's where the app is currently storing affiliate data
        const affiliateUserRef = doc(db, 'users', ref);
        updateDoc(affiliateUserRef, {
          totalClicks: increment(1)
        });

        // Update local cooldown
        localStorage.setItem(lastClickKey, now.toString());
        
      } catch (error) {
        // Silent error handling to avoid disrupting user experience
        console.error('Affiliate tracking error:', error);
      }
    };

    handleTracking();
  }, [searchParams, user, db]);

  return null;
}
