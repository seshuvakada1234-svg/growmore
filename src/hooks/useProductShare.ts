'use client';

import { useState } from 'react';
import { MonterraProduct, MonterraUser, SharePlatform } from '@/types/affiliate.types';
import { 
  calculateEarning, 
  saveAffiliateLink 
} from '@/lib/affiliateEngine';
import { toast } from '@/hooks/use-toast';

interface UseProductShareProps {
  product: MonterraProduct;
  user: MonterraUser | null;
}

/**
 * Generates a fresh affiliate link at call time — never stale, never empty.
 * Does NOT depend on React state for the URL itself.
 */
function buildFreshLink(product: MonterraProduct, user: MonterraUser | null): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://monterra.in';
  const slug = product.slug || product.id;
  const base = `${origin}/plants/${slug}`;
  return user?.affiliateApproved ? `${base}?ref=${user.uid}` : base;
}

function buildFreshMessage(product: MonterraProduct, link: string, user: MonterraUser | null): string {
  const earning = calculateEarning(product.price, product.affiliateCommission);
  if (user?.affiliateApproved && earning) {
    return `Check out this beautiful ${product.name} on Monterra! 🌿\n\n💰 Earn ₹${earning} if someone buys through your link 🌱\n\n${link}`;
  }
  return `I found this amazing ${product.name} on Monterra! You should check it out: ${link}`;
}

/**
 * Hook to handle product sharing logic for both regular users and affiliates.
 * All share actions generate a fresh link at click time — no timing bugs.
 */
export function useProductShare({ product, user }: UseProductShareProps) {
  const [copied, setCopied] = useState(false);

  const isAffiliate = user?.affiliateApproved === true;
  const potentialEarning = calculateEarning(product.price, product.affiliateCommission);

  // Derived values exposed for display purposes (e.g. showing the link in UI)
  // These are always fresh — computed on every render, not stored in state.
  const shareLink = buildFreshLink(product, user);
  const shareMessage = buildFreshMessage(product, shareLink, user);

  const handleShare = async (platform: SharePlatform) => {
    // Always generate a fresh link at the moment of sharing — never use stale state
    const freshLink = buildFreshLink(product, user);
    const freshMessage = buildFreshMessage(product, freshLink, user);

    // ── Affiliates: log share to Firestore (non-blocking) ────────────────────
    if (isAffiliate && user) {
      try {
        const originalUrl = `${window.location.origin}/plants/${product.slug || product.id}`;
        await saveAffiliateLink(user.uid, originalUrl, freshLink);
      } catch (err) {
        // Silent fail — share always continues regardless of logging result
        console.warn('Affiliate link logging failed (share will continue):', err);
      }
    }

    // ── Platform routing ─────────────────────────────────────────────────────
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(freshMessage)}`, '_blank');
        break;

      case 'telegram':
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(freshLink)}&text=${encodeURIComponent(product.name)}`,
          '_blank'
        );
        break;

      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(freshLink)}`,
          '_blank'
        );
        break;

      case 'copy':
      case 'instagram': {
        try {
          await navigator.clipboard.writeText(freshLink);
          setCopied(true);
          toast({
            title: '✅ Link Copied!',
            description: 'Affiliate link copied to clipboard.',
          });
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error('Clipboard write failed:', err);
          toast({
            title: 'Copy failed',
            description: 'Could not copy link. Please try again.',
            variant: 'destructive',
          });
        }
        break;
      }

      default:
        break;
    }
  };

  const handleCopyLink = () => handleShare('copy');

  const handleDefaultShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      const freshLink = buildFreshLink(product, user);
      const freshMessage = buildFreshMessage(product, freshLink, user);
      try {
        await navigator.share({
          title: product.name,
          text: freshMessage,
          url: freshLink,
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
    shareLink,       // fresh on every render — safe to display in UI
    shareMessage,    // fresh on every render
    potentialEarning,
    isAffiliate,
    copied,
    handleShare,
    handleCopyLink,
    handleDefaultShare,
  };
}