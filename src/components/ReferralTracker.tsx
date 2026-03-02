
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, collection, addDoc, updateDoc, increment, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

/**
 * Silent component that captures referrals and logs clicks with anti-fraud protection.
 */
export function ReferralTracker() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const db = useFirestore();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (!ref || !db) return;

    // Persist referral locally
    localStorage.setItem('affiliate_ref', ref);

    const recordClick = async () => {
      // 1. Self-click prevention
      if (user?.uid === ref) return;

      // 2. 24-hour cooldown per browser
      const cooldownKey = `click_cd_${ref}`;
      const lastClick = localStorage.getItem(cooldownKey);
      const now = Date.now();
      if (lastClick && now - parseInt(lastClick) < 86400000) return;

      try {
        // 3. Log detailed click for audit
        await addDoc(collection(db, 'affiliateClicks'), {
          affiliateId: ref,
          userAgent: navigator.userAgent,
          createdAt: serverTimestamp(),
          authenticatedUserId: user?.uid || null
        });

        // 4. Update aggregate click counter on affiliate profile
        // Note: The app currently uses the root user doc for affiliate stats
        const affiliateRef = doc(db, 'users', ref);
        updateDoc(affiliateRef, {
          totalClicks: increment(1),
          updatedAt: serverTimestamp()
        });

        localStorage.setItem(cooldownKey, now.toString());
      } catch (e) {
        console.error("Referral log failed silently", e);
      }
    };

    recordClick();
  }, [searchParams, user, db]);

  return null;
}
