'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * A silent client-side component that captures the 'ref' parameter from the URL
 * and stores it in localStorage for affiliate tracking.
 */
export function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      // Store the referrer UID in localStorage to persist across pages/sessions
      localStorage.setItem('affiliateRef', ref);
      console.log('Affiliate referral captured:', ref);
    }
  }, [searchParams]);

  return null;
}
