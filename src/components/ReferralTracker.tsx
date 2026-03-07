'use client';

import { useAffiliateTracker } from '@/hooks/useAffiliateTracker';

/**
 * Updated ReferralTracker component that uses the new affiliate tracking hook.
 * This should remain at the root of the application.
 */
export function ReferralTracker() {
  useAffiliateTracker();
  return null;
}
