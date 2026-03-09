'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface AffiliateContextType {
  isApproved: boolean;
  affiliateProfile: any | null;
  loading: boolean;
}

const AffiliateContext = createContext<AffiliateContextType>({
  isApproved: false,
  affiliateProfile: null,
  loading: true,
});

/**
 * Global provider that tracks affiliate approval status in real-time.
 * Now uses the users collection as the source of truth for approval status.
 */
export function AffiliateProvider({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [affiliateProfile, setAffiliateProfile] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to initialize
    if (isUserLoading) return;

    // If no user, reset state
    if (!user) {
      setAffiliateProfile(null);
      setUserProfile(null);
      setLoading(false);
      return;
    }

    // 1. Listen to Affiliate Profile (Bank details, earnings)
    const unsubAffiliate = onSnapshot(
      doc(db, 'affiliateProfiles', user.uid),
      (snapshot) => {
        setAffiliateProfile(snapshot.exists() ? snapshot.data() : null);
      },
      (error) => {
        console.error('Affiliate profile listener error:', error);
      }
    );

    // 2. Listen to User Profile (Role and canonical approval status)
    const unsubUser = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        setUserProfile(snapshot.exists() ? snapshot.data() : null);
        setLoading(false);
      },
      (error) => {
        console.error('User profile listener error:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubAffiliate();
      unsubUser();
    };
  }, [user, isUserLoading, db]);

  // The canonical source of truth for approval
  const isApproved = userProfile?.affiliateApproved === true;

  return (
    <AffiliateContext.Provider value={{ isApproved, affiliateProfile, loading }}>
      {children}
    </AffiliateContext.Provider>
  );
}

export const useAffiliate = () => useContext(AffiliateContext);
