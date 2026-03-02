
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, collection, addDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

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

      // 2. 24-hour cooldown per browser session
      const cooldownKey = `click_cd_${ref}`;
      const lastClick = localStorage.getItem(cooldownKey);
      const now = Date.now();
      if (lastClick && now - parseInt(lastClick) < 86400000) return;

      try {
        // 3. Log detailed click for audit
        await addDoc(collection(db, 'affiliateClicks'), {
          affiliateId: ref,
          createdAt: serverTimestamp(),
          authenticatedUserId: user?.uid || null,
          userAgent: navigator.userAgent
        });

        // 4. Update aggregate click counter on affiliate profile
        const profileRef = doc(db, 'affiliateProfiles', ref);
        updateDoc(profileRef, {
          totalClicks: increment(1),
          updatedAt: serverTimestamp()
        }).catch(() => {/* Silent fail if profile doesn't exist yet */});

        localStorage.setItem(cooldownKey, now.toString());
      } catch (e) {
        // Silent fail for non-critical logging
      }
    };

    recordClick();
  }, [searchParams, user, db]);

  return null;
}
