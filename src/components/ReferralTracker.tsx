
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, collection, addDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

/**
 * Silent component that captures referrals and logs clicks.
 * Clicks are updated in the siloed affiliate profile.
 */
export function ReferralTracker() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const db = useFirestore();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (!ref || !db) return;

    localStorage.setItem('affiliate_ref', ref);

    const recordClick = async () => {
      if (user?.uid === ref) return;

      const cooldownKey = `click_cd_${ref}`;
      const lastClick = localStorage.getItem(cooldownKey);
      const now = Date.now();
      if (lastClick && now - parseInt(lastClick) < 86400000) return;

      try {
        // Log top-level audit for clicks
        await addDoc(collection(db, 'affiliateClicks'), {
          affiliateId: ref,
          createdAt: serverTimestamp(),
          authenticatedUserId: user?.uid || null,
          userAgent: navigator.userAgent
        });

        // Update siloed aggregate click counter
        const profileRef = doc(db, 'users', ref, 'affiliate', 'profile');
        updateDoc(profileRef, {
          totalClicks: increment(1),
          updatedAt: serverTimestamp()
        }).catch(() => {});

        localStorage.setItem(cooldownKey, now.toString());
      } catch (e) {}
    };

    recordClick();
  }, [searchParams, user, db]);

  return null;
}
