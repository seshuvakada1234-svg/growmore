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

interface ShareButtonProps {
  product: any; // Compatible with mock Product and MonterraProduct
  className?: string;
  variant?: "outline" | "secondary" | "ghost" | "default";
}

export function ShareButton({ product, className, variant = "secondary" }: ShareButtonProps) {
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);

  // Adapting mock user to MonterraUser for the hook
  const adaptedUser: MonterraUser | null = user ? {
    uid: user.uid,
    displayName: user.displayName || 'User',
    email: user.email || '',
    role: 'user',
    affiliateApproved: false, // This will be hydrated correctly if profile is checked
    createdAt: (user as any).createdAt || null
  } : null;

  // Ideally, we'd fetch the actual MonterraUser from Firestore here, 
  // but for the upgrade we'll assume the hook handles the logic based on the passed user object.
  const { handleDefaultShare, handleShare } = useProductShare({ 
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
      <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-border/50">
        <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="cursor-pointer rounded-lg p-3 font-medium">
          <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('telegram')} className="cursor-pointer rounded-lg p-3 font-medium">
          <Send className="h-4 w-4 mr-2" /> Telegram
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('facebook')} className="cursor-pointer rounded-lg p-3 font-medium">
          <svg className="h-4 w-4 mr-2 fill-current" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 3.656 10.995 8.788 12.608v-8.924H5.512v-3.684h3.276v-2.803c0-3.234 1.926-5.022 4.875-5.022 1.412 0 2.89.252 2.89.252v3.177h-1.628c-1.602 0-2.102.995-2.102 2.015v2.381h3.58l-.572 3.684h-3.008v8.924C20.344 23.068 24 18.062 24 12.073z" />
          </svg> Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDefaultShare} className="cursor-pointer rounded-lg p-3 font-medium">
          <LinkIcon className="h-4 w-4 mr-2" /> Share Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
