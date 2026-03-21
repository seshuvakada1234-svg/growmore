'use client';

import { useState, useEffect } from 'react';
import { MonterraProduct, MonterraUser, SharePlatform } from '@/types/affiliate.types';
import { 
  generateShareLink, 
  calculateEarning, 
  generateShareMessage, 
  triggerShare,
  saveAffiliateLink 
} from '@/lib/affiliateEngine';
import { toast } from '@/hooks/use-toast';

interface UseProductShareProps {
  product: MonterraProduct;
  user: MonterraUser | null;
}

/**
 * Hook to handle product sharing logic for both regular users and affiliates.
 */
export function useProductShare({ product, user }: UseProductShareProps) {
  const [shareLink, setShareLink] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const isAffiliate = user?.affiliateApproved === true;
  const potentialEarning = calculateEarning(product.price, product.affiliateCommission);

  useEffect(() => {
    const link = generateShareLink(product.slug || product.id, user);
    const msg = generateShareMessage(product, link, user);
    setShareLink(link);
    setShareMessage(msg);
  }, [product, user]);

  const handleShare = async (platform: SharePlatform) => {
    // ── Affiliates: log share link to Firestore for tracking ─────────────────
    // try/catch ensures share always works even if Firestore write fails
    if (isAffiliate && user) {
      try {
        const originalUrl = `${window.location.origin}/plants/${product.slug || product.id}`;
        await saveAffiliateLink(user.uid, originalUrl, shareLink);
      } catch (err) {
        // Silent fail — share continues regardless of logging result
        console.warn('Affiliate link logging failed (share will continue):', err);
      }
    }

    const result = await triggerShare(platform, shareMessage, shareLink, product.name);
    
    if (result.copied) {
      setCopied(true);
      toast({ 
        title: "Link Copied!", 
        description: "Link copied to clipboard!",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => handleShare('copy');

  const handleDefaultShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: shareMessage,
          url: shareLink,
        });
      } catch (err) {
        // Fallback to copy if share is cancelled or fails
        if ((err as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return {
    shareLink,
    shareMessage,
    potentialEarning,
    isAffiliate,
    copied,
    handleShare,
    handleCopyLink,
    handleDefaultShare
  };
}