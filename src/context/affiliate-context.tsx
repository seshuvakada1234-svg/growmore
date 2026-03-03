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
 */
export function AffiliateProvider({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [affiliateProfile, setAffiliateProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to initialize
    if (isUserLoading) return;

    // If no user, reset state
    if (!user) {
      setAffiliateProfile(null);
      setLoading(false);
      return;
    }

    // Set up real-time listener for affiliate profile
    const unsubscribe = onSnapshot(
      doc(db, 'affiliateProfiles', user.uid),
      (snapshot) => {
        setAffiliateProfile(snapshot.exists() ? snapshot.data() : null);
        setLoading(false);
      },
      (error) => {
        console.error('Affiliate listener error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, isUserLoading, db]);

  // The single source of truth: approved field must be boolean true
  const isApproved = affiliateProfile?.approved === true;

  return (
    <AffiliateContext.Provider value={{ isApproved, affiliateProfile, loading }}>
      {children}
    </AffiliateContext.Provider>
  );
}

export const useAffiliate = () => useContext(AffiliateContext);
