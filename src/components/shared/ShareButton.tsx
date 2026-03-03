
'use client';

import React, { useState, useEffect } from 'react';
import { Share2, Link as LinkIcon, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

interface ShareButtonProps {
  product: {
    id: string;
    name: string;
    slug?: string;
  };
  className?: string;
  variant?: "outline" | "secondary" | "ghost" | "default";
}

/**
 * A reusable share button component that provides native sharing or a custom menu.
 */
export function ShareButton({ product, className, variant = "secondary" }: ShareButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getProductUrl = () => {
    if (typeof window === 'undefined') return '';
    const slug = product.slug || product.id;
    // Requested URL format: origin + /product/ + slug
    return `${window.location.origin}/product/${slug}`;
  };

  const copyToClipboard = (text: string, successMsg: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        toast({ title: successMsg });
      }).catch(() => {
        toast({ title: "Failed to copy link", variant: "destructive" });
      });
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      const url = getProductUrl();
      try {
        await navigator.share({
          title: product.name,
          url: url,
        });
      } catch (err) {
        // If native share was cancelled or failed, we just log it.
        // The dropdown is still there as a fallback for some browsers.
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed', err);
        }
      }
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: <MessageCircle className="h-4 w-4 mr-2" />,
      action: () => {
        const url = getProductUrl();
        window.open(`https://wa.me/?text=${encodeURIComponent(product.name + ': ' + url)}`, '_blank');
      },
    },
    {
      name: 'Facebook',
      icon: (
        <svg className="h-4 w-4 mr-2 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 3.656 10.995 8.788 12.608v-8.924H5.512v-3.684h3.276v-2.803c0-3.234 1.926-5.022 4.875-5.022 1.412 0 2.89.252 2.89.252v3.177h-1.628c-1.602 0-2.102.995-2.102 2.015v2.381h3.58l-.572 3.684h-3.008v8.924C20.344 23.068 24 18.062 24 12.073z" />
        </svg>
      ),
      action: () => {
        const url = getProductUrl();
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
      },
    },
    {
      name: 'Instagram',
      icon: (
        <svg className="h-4 w-4 mr-2 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
      ),
      action: () => copyToClipboard(getProductUrl(), "Link copied. Paste in Instagram bio or DM."),
    },
    {
      name: 'Copy Link',
      icon: <LinkIcon className="h-4 w-4 mr-2" />,
      action: () => copyToClipboard(getProductUrl(), "Link copied successfully!"),
    },
  ];

  const onTriggerClick = (e: React.MouseEvent) => {
    // Prevent navigating if inside a card link
    e.preventDefault();
    e.stopPropagation();
    
    // If Web Share is supported, trigger it immediately
    if (typeof navigator !== 'undefined' && navigator.share) {
      handleNativeShare();
    }
  };

  // Standard Next.js practice to avoid hydration mismatch when using browser-only globals
  // We return a non-interactive placeholder button during SSR
  if (!mounted) {
    return (
      <Button 
        variant={variant} 
        size="icon" 
        className={className}
        disabled
      >
        <Share2 className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size="icon" 
          className={className}
          onClick={onTriggerClick}
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-border/50">
        {shareOptions.map((opt) => (
          <DropdownMenuItem 
            key={opt.name} 
            onClick={(e) => {
              e.stopPropagation();
              opt.action();
            }} 
            className="cursor-pointer rounded-lg p-3 font-medium"
          >
            {opt.icon}
            {opt.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
