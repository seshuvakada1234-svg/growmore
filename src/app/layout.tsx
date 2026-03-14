import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ReferralTracker } from '@/components/ReferralTracker';
import { AffiliateProvider } from '@/context/affiliate-context';
import { Suspense } from 'react';
import MonterraChatbot from '@/components/MonterraChatbot';
import { MobileNav } from '@/components/layout/MobileNav';

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

            <MobileNav />

            <MonterraChatbot />
            <Toaster />
          </AffiliateProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
