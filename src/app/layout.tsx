import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ReferralTracker } from '@/components/ReferralTracker';
import { AffiliateProvider } from '@/context/affiliate-context';
import { Suspense } from 'react';
import Link from 'next/link';
import { Home, Leaf, ShoppingCart, User } from 'lucide-react';
import MonterraChatbot from '@/components/MonterraChatbot';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Monterra | Premium Plants & Affiliate Marketplace',
  description: 'Monterra is a premium plant marketplace with affiliate earnings. Grow naturally, earn naturally.',
  icons: {
    icon: [
      { url: '/assets/images/app_logo.png', type: 'image/x-icon' }
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground overflow-x-hidden">
        <FirebaseClientProvider>
          <AffiliateProvider>
            <Suspense fallback={null}>
              <ReferralTracker />
            </Suspense>
            <main className="pb-20 md:pb-0 min-h-screen flex flex-col">
              {children}
            </main>

            {/* Mobile Bottom Navigation Bar - Only visible on mobile screens */}
            <nav className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t flex justify-around py-3 md:hidden z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
              <Link href="/" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-all">
                <Home className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
              </Link>
              <Link href="/plants" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-all">
                <Leaf className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Plants</span>
              </Link>
              <Link href="/cart" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-all">
                <ShoppingCart className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Cart</span>
              </Link>
              <Link href="/profile" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-all">
                <User className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Account</span>
              </Link>
            </nav>

            <MonterraChatbot />
            <Toaster />
          </AffiliateProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
