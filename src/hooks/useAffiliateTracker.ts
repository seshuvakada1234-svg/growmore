'use client';

import { useEffect } from 'react';
import { trackAffiliateClick } from '@/lib/affiliateEngine';

/**
 * Hook to initialize affiliate attribution tracking on application load.
 */
export function useAffiliateTracker() {
  useEffect(() => {
    trackAffiliateClick();
  }, []);
}
