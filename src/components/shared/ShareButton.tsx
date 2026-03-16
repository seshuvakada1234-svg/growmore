'use client';

import React, { useState, useEffect } from 'react';
import { Share2, Link as LinkIcon, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProductShare } from '@/hooks/useProductShare';
import { MonterraProduct, MonterraUser } from '@/types/affiliate.types';
import { useUser } from '@/firebase';

interface ShareMenuProps {
  product: any; // Compatible with mock Product and MonterraProduct
  className?: string;
  variant?: "outline" | "secondary" | "ghost" | "default";
}

/**
 * Reusable Share Menu component for product sharing.
 * Provides options for social platforms and copying the product link.
 */
export function ShareMenu({ product, className, variant = "secondary" }: ShareMenuProps) {
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);

  // Adapting user to MonterraUser for the hook
  const adaptedUser: MonterraUser | null = user ? {
    uid: user.uid,
    displayName: user.displayName || 'User',
    email: user.email || '',
    role: 'user',
    affiliateApproved: false, // hydrate via actual profile check if needed
    createdAt: (user as any).createdAt || null
  } : null;

  const { handleShare, handleCopyLink } = useProductShare({ 
    product: product as MonterraProduct, 
    user: adaptedUser 
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant={variant} size="icon" className={className} disabled>
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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-2xl shadow-xl border-border/50 p-2">
        <DropdownMenuItem 
          onClick={() => handleShare('whatsapp')} 
          className="cursor-pointer rounded-xl p-3 font-semibold text-sm hover:bg-emerald-50 text-emerald-900 transition-colors"
        >
          <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleShare('telegram')} 
          className="cursor-pointer rounded-xl p-3 font-semibold text-sm hover:bg-blue-50 text-blue-900 transition-colors"
        >
          <Send className="h-4 w-4 mr-2" /> Telegram
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleShare('facebook')} 
          className="cursor-pointer rounded-xl p-3 font-semibold text-sm hover:bg-indigo-50 text-indigo-900 transition-colors"
        >
          <svg className="h-4 w-4 mr-2 fill-current" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 3.656 10.995 8.788 12.608v-8.924H5.512v-3.684h3.276v-2.803c0-3.234 1.926-5.022 4.875-5.022 1.412 0 2.89.252 2.89.252v3.177h-1.628c-1.602 0-2.102.995-2.102 2.015v2.381h3.58l-.572 3.684h-3.008v8.924C20.344 23.068 24 18.062 24 12.073z" />
          </svg> Facebook
        </DropdownMenuItem>
        
        <div className="h-px bg-border my-1 mx-1" />
        
        <DropdownMenuItem 
          onClick={handleCopyLink} 
          className="cursor-pointer rounded-xl p-3 font-semibold text-sm hover:bg-accent text-primary transition-colors"
        >
          <LinkIcon className="h-4 w-4 mr-2" /> Share Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Keeping compatibility alias
export const ShareButton = ShareMenu;
