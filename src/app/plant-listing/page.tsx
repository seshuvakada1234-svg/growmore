import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import Footer from '@/components/Footer';
import PlantListingGrid from './components/PlantListingGrid';

export const metadata: Metadata = {
  title: 'Buy Plants Online – 500+ Varieties | Monterra',
  description: 'Browse our complete collection of indoor plants, succulents, tropical plants & more at Monterra. Filter by care level, price, size. Free delivery above ₹499.',
  keywords: 'buy indoor plants online, plant shop India, succulents online, air purifying plants, Monterra',
};

export default function PlantListingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <Header />
      <main>
        <Suspense fallback={
          <div className="max-w-7xl mx-auto px-4 py-12 text-center">
            <div className="text-4xl mb-4 animate-spin-slow inline-block">🌿</div>
            <p className="text-[#4A6741] font-semibold">Loading plants...</p>
          </div>
        }>
          <PlantListingGrid />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
