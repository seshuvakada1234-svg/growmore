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
  const [statusMsg, setStatusMsg] = useState('');

  const isAffiliate = user?.affiliateApproved === true;
  const potentialEarning = calculateEarning(product.price, product.affiliateCommission);

  useEffect(() => {
    const link = generateShareLink(product.slug, user);
    const msg = generateShareMessage(product, link, user);
    setShareLink(link);
    setShareMessage(msg);
  }, [product, user]);

  const handleShare = async (platform: SharePlatform) => {
    // If affiliate, ensure the link is logged in the system
    if (isAffiliate && user) {
      const originalUrl = `https://monterra.com/plants/${product.slug}`;
      await saveAffiliateLink(user.uid, originalUrl, shareLink);
    }

    const result = await triggerShare(platform, shareMessage, shareLink, product.name);
    
    if (result.copied) {
      setCopied(true);
      toast({ title: "Link Copied!", description: "Paste it anywhere to share." });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDefaultShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: shareMessage,
          url: shareLink,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleShare('whatsapp');
        }
      }
    } else {
      handleShare('whatsapp');
    }
  };

  return {
    shareLink,
    shareMessage,
    potentialEarning,
    isAffiliate,
    copied,
    statusMsg,
    handleShare,
    handleDefaultShare
  };
}
